import cheerio from 'cheerio'
import { cli } from 'cli-ux'
import { format } from 'date-fns'
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from 'fs'
import Handlebars from 'handlebars'
import fetch from 'node-fetch'
import { join } from 'path'
import { Worker } from 'worker_threads'

import {
  appendHtmlPostfix,
  makeScriptLinksRelativeToWiki,
  moveRelativeLinksUpOneLevel,
  prefixRelativeRoot,
  reworkLinks,
  reworkScriptSrcs
} from './article-transforms'
import {
  Directories,
  MessageRequestTypes as MessageRequestType,
  MessageResponseTypes as MessageResponseType,
  Options
} from './domain'
import { assertNever } from './utils/assert-never'
import walkFiles from './utils/walk-files'

const ARTICLE_BATCH_SIZE = 100

const indexRedirectFragment = readFileSync(
  './src/templates/index_redirect_fragment.handlebars'
)

const footerFragment = readFileSync(
  './src/templates/footer_fragment.handlebars'
)

export const copyImageAssetsIntoWiki = async (
  assetsDir: string,
  { imagesFolder }: Directories
) => {
  cli.action.start('  Copying image assets into unpacked zim directory ')
  const imagesFiles = readdirSync(assetsDir)

  for (const imageFile of imagesFiles) {
    const filepath = join(assetsDir, imageFile)
    const info = lstatSync(filepath)

    if (!info.isFile()) {
      return
    }

    const imagesFolderPath = join(imagesFolder, imageFile)
    copyFileSync(filepath, imagesFolderPath)
  }
  cli.action.stop()
}

export const moveArticleFolderToWiki = ({
  articleFolder,
  wikiFolder
}: Directories) => {
  if (existsSync(wikiFolder)) {
    return
  }

  cli.action.start('  Renaming A namespace to wiki ')
  renameSync(articleFolder, wikiFolder)
  cli.action.stop()
}

export const insertIndexRedirect = (options: Options) => {
  cli.action.start("  Inserting root 'index.html' as redirect to main page")
  const template = Handlebars.compile(indexRedirectFragment.toString())

  const indexPath = join(options.unpackedZimDir, 'index.html')
  writeFileSync(
    indexPath,
    template({
      MAIN_PAGE: options.mainPage
    })
  )

  cli.action.stop()
}

export const resolveDirectories = (options: Options) => {
  const articleFolder = join(options.unpackedZimDir, 'A')
  const imagesFolder = join(options.unpackedZimDir, 'I', 'm')
  const wikiFolder = join(options.unpackedZimDir, 'wiki')
  const jsmodulesFolder = join(options.unpackedZimDir, '-', 'j', 'js_modules')

  const directories: Directories = {
    unpackedZimDir: options.unpackedZimDir,
    articleFolder,
    imagesFolder,
    wikiFolder,
    jsmodulesFolder
  }

  return directories
}

export const generateMainPage = async (
  options: Options,
  { wikiFolder }: Directories
) => {
  const kiwixMainpage = readFileSync(
    join(wikiFolder, `${options.kiwixMainPage}.html`)
  )

  const mainPagePath = join(wikiFolder, options.mainPage)

  cli.action.start(`  Generating main page into ${mainPagePath} `)

  const $kiwixMainPageHtml = cheerio.load(kiwixMainpage.toString())

  const canonicalUrlString = $kiwixMainPageHtml('link[rel="canonical"]').attr(
    'href'
  )

  if (!canonicalUrlString) {
    throw new Error(
      `Could not parse out canonical url for ${canonicalUrlString}`
    )
  }

  let canonicalPageVersionid: string

  if (options.mainPageVersion) {
    canonicalPageVersionid = options.mainPageVersion.toString()
  } else {
    const matches = $kiwixMainPageHtml.html().match(/(?<=oldid=)\d+/g)

    if (!matches) {
      throw new Error('Could not parse out the canoncial urls version id')
    }

    canonicalPageVersionid = matches[0]
  }

  const canonicalUrl = new URL(canonicalUrlString)
  canonicalUrl.pathname = `wiki/${options.mainPage.replace('.html', '')}`

  canonicalUrl.searchParams.append('oldid', canonicalPageVersionid)

  try {
    const response = await fetch(canonicalUrl)
    const pageBody = await response.text()
    const $remoteMainPageHtml = cheerio.load(pageBody)

    const $remoteContent = $remoteMainPageHtml('#content')

    $remoteContent.addClass('content')
    $remoteContent.find('#siteNotice').remove()
    $remoteContent.find('#firstHeading').remove()
    $remoteContent.find('#siteSub').remove()
    $remoteContent.find('#contentSub').remove()
    $remoteContent.find('#catlinks').remove()
    $remoteContent.find('#mw-fr-revisiontag-old').remove()
    $remoteContent.find('a.mw-jump-link').remove()

    // Some styling on the top banner - I know, this has got ... hacky

    // Set the width to 100%
    $remoteContent
      .find('#mp-topbanner')
      .attr('style', 'width:100% !important; margin-bottom:2px;')

    // Slightly reduce the size of the text
    $remoteContent
      .find('#mp-topbanner tbody tbody tr td:last-of-type')
      .attr('style', 'width:16%; font-size:95%;')

    // Change the globe icon to the wikipedia-on-IPFS version
    $remoteContent
      .find('.globegris')
      .attr(
        'style',
        'background-image: url("../I/m/wikipedia-on-ipfs.png"); background-repeat:no-repeat; background-position:-20px -40px; background-size: 200px; width:100%; border:1px solid #a7d7f9; vertical-align:top;'
      )

    const $kiwixNote = $kiwixMainPageHtml('#mw-content-text > div:last-child')

    $remoteContent.find('#mw-content-text').append($kiwixNote)

    $kiwixMainPageHtml('#content').remove()
    $kiwixMainPageHtml('#mw-mf-page-center').prepend($remoteContent)

    reworkLinks(
      $kiwixMainPageHtml,
      'a[href^="/wiki/"]:not(a[href$=".svg"]):not(a[href$=".png"]):not(a[href$=".jpg"])',
      [appendHtmlPostfix, prefixRelativeRoot]
    )

    // update css links
    reworkLinks($kiwixMainPageHtml, 'link[href^="../../"]', [
      moveRelativeLinksUpOneLevel
    ])

    if (options.kiwixMainPage.includes('/')) {
      reworkScriptSrcs($kiwixMainPageHtml, 'script', [
        moveRelativeLinksUpOneLevel
      ])
    } else {
      reworkScriptSrcs($kiwixMainPageHtml, 'script', [
        makeScriptLinksRelativeToWiki
      ])
    }

    writeFileSync(mainPagePath, $kiwixMainPageHtml.html())

    cli.action.stop()
  } catch (error) {
    cli.error(error)
  }
}

export const appendJavscript = (
  options: Options,
  { unpackedZimDir, jsmodulesFolder }: Directories
) => {
  cli.action.start('  Appending custom javascript to site.js ')

  const delimiter = '/* Appended by Distributed Wikipedia Mirror */'
  const targetSiteJsFile = join(jsmodulesFolder, 'site.js')

  const dwmSitejsTemplate = readFileSync('./src/templates/site.js.handlebars')
    .toString()
    .replace('<script>', '')
    .replace('</script>', '')

  const context = {
    SNAPSHOT_DATE: format(new Date(), 'yyyy-MM'),
    IPNS_HASH: options.hostingIPNSHash,
    HOSTING_DNS_DOMAIN: options.hostingDNSDomain,
    ZIM_URL:
      options.zimFileSourceUrl ??
      'https://wiki.kiwix.org/wiki/Content_in_all_languages'
  }

  const dwmSitejs = Handlebars.compile(dwmSitejsTemplate.toString())({
    FOOTER_TEMPLATE: footerFragment,
    DWM_OPTIONS: JSON.stringify(context, null, 2)
  })

  let originalSiteJs = readFileSync(targetSiteJsFile).toString()

  // hack out erroring site.js code
  originalSiteJs = originalSiteJs.replace(
    'if(wgCanonicalSpecialPageName=="Watchlist")importScript(\'MediaWiki:Common.js/WatchlistNotice.js\');',
    ''
  )

  if (originalSiteJs.includes(delimiter)) {
    originalSiteJs = originalSiteJs.split(delimiter)[0]
  }

  // const updatedSiteJs = `${originalSiteJs}\n${delimiter}\n${dwmSitejs}`
  const updatedSiteJs = `\n${delimiter}\n${dwmSitejs}`

  writeFileSync(targetSiteJsFile, updatedSiteJs)

  // hack to stop console error
  const targetJsConfigVarFile = join(jsmodulesFolder, 'jsConfigVars.js')
  writeFileSync(targetJsConfigVarFile, '{}')

  // hack replace the unexpected var in startup.js
  const startupJsFile = join(jsmodulesFolder, 'startup.js')
  let startJs = readFileSync(startupJsFile).toString()
  startJs = startJs
    .replace('function domEval(code){var', 'function domEval(code){')
    .replace('"/w/load.php"', '"../w/load.php"')
  writeFileSync(startupJsFile, startJs)

  // Create a stub load.php
  const loadPhpPath = join(unpackedZimDir, 'w', 'load.php')
  if (!existsSync(loadPhpPath)) {
    mkdirSync(join(unpackedZimDir, 'w'))
    writeFileSync(loadPhpPath, '/* Stubbed by Distributed Wikipedia Mirror */')
  }

  // hack: overwrite erroring js files see https://github.com/openzim/mwoffliner/issues/894
  for (const file of []) {
    const filepath = join(jsmodulesFolder, file)
    const overwriteText =
      '/* Overwritten by Distributed Wikipedia Mirror to prevent js errors, see https://github.com/openzim/mwoffliner/issues/894 */'
    writeFileSync(filepath, overwriteText)
  }

  cli.action.stop()
}

async function* iteratorTake<T>(
  generator: AsyncGenerator<T, any, any>,
  batchSize: number
) {
  let batch: T[] = []

  for await (const element of generator) {
    batch.push(element)

    if (batch.length === batchSize) {
      yield batch
      batch = []
    }
  }

  if (batch.length === 0) {
    return
  }

  yield batch
}

const sendNextProcessArticlesMessage = async (
  worker: Worker,
  articleBatches: AsyncGenerator<string[], any, any>
) => {
  const nextFileResult = await articleBatches.next()

  if (nextFileResult.done) {
    worker.postMessage({ type: MessageRequestType.EXIT })
    return
  }

  const articles = nextFileResult.value

  worker.postMessage({
    type: MessageRequestType.PROCESS_ARTICLES,
    articles: articles
  })
}

const runArticleWorker = (
  options: Options,
  directories: Directories,
  articleBatches: AsyncGenerator<string[], any, any>,
  batchCompleteFn: (numberProcessed: number) => void
) => {
  const worker = new Worker('./src/article-worker.import.js', {
    workerData: { options, directories }
  })

  worker.on('message', message => {
    const messageType: MessageResponseType = message.type

    switch (messageType) {
      case MessageResponseType.READY:
        sendNextProcessArticlesMessage(worker, articleBatches)
        break
      case MessageResponseType.PROCESSED_ARTICLES:
        batchCompleteFn(message.processed)
        sendNextProcessArticlesMessage(worker, articleBatches)
        break
      default:
        assertNever(messageType)
    }
  })

  const exitPromise = new Promise<void>((resolve, reject) => {
    worker.once('exit', err => {
      if (err) {
        reject(err)
      }

      resolve()
    })
  })

  return exitPromise
}

export const processArticles = async (
  options: Options,
  directories: Directories,
  cli: any
) => {
  cli.log(' Processing articles:')
  const { wikiFolder } = directories
  const rootArticleDir = join(wikiFolder)

  let totalArticleCount = 0
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const _filepath of walkFiles(rootArticleDir)) {
    totalArticleCount++
  }

  const progressBar = cli.progress({
    format: '  Articles | {bar} | {percentage}% | {value}/{total} Files'
  })

  let processingCount = 0
  progressBar.start(totalArticleCount, processingCount)

  const articleBatches = iteratorTake(
    walkFiles(rootArticleDir),
    ARTICLE_BATCH_SIZE
  )

  const workthreadExitPromises: Promise<void>[] = []

  for (let index = 0; index < options.noOfWorkerThreads; index++) {
    const workerExitPromise = runArticleWorker(
      options,
      directories,
      articleBatches,
      (numberProcessed: number) => {
        processingCount += numberProcessed
        progressBar.update(processingCount)
      }
    )

    workthreadExitPromises.push(workerExitPromise)
  }

  await Promise.all(workthreadExitPromises)

  progressBar.stop()
}
