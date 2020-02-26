import {
  readdirSync,
  readFileSync,
  writeFileSync,
  lstatSync,
  copyFileSync,
  renameSync,
  existsSync
} from 'fs'
import { join, relative } from 'path'
import Handlebars from 'handlebars'
import { Options, Directories, EnhancedOpts } from './domain'
import walkFiles from './utils/walk-files'
import { processArticle } from './process-article'
import cheerio from 'cheerio'
import fetch from 'node-fetch'
import {
  reworkLinks,
  appendHtmlPostfix,
  appendFooter,
  prefixRelativeRoot
} from './article-transforms'
import { cli } from 'cli-ux'

const indexRedirectFragment = readFileSync(
  './src/index_redirect_fragment.handlebars'
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

  const directories: Directories = {
    unpackedZimDir: options.unpackedZimDir,
    articleFolder,
    imagesFolder,
    wikiFolder
  }

  return directories
}

export const generateMainPage = async (
  options: Options,
  { wikiFolder, imagesFolder }: Directories
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

    const $kiwixNote = $kiwixMainPageHtml('#mw-content-text > div:last-child')

    $remoteContent.find('#mw-content-text').append($kiwixNote)

    $kiwixMainPageHtml('#content').remove()
    $kiwixMainPageHtml('#mw-mf-page-center').prepend($remoteContent)

    const enhancedOpts: EnhancedOpts = Object.assign(options, {
      snapshotDate: new Date(),
      relativeFilepath: relative(wikiFolder, mainPagePath),
      relativeImagePath: relative(wikiFolder, imagesFolder),
      canonicalUrl: canonicalUrl.href
    })

    reworkLinks(
      $kiwixMainPageHtml,
      'a[href^="/wiki/"]:not(a[href$=".svg"]):not(a[href$=".png"]):not(a[href$=".jpg"])',
      [appendHtmlPostfix, prefixRelativeRoot]
    )

    appendFooter($kiwixMainPageHtml, enhancedOpts)
    writeFileSync(mainPagePath, $kiwixMainPageHtml.html())

    cli.action.stop()
  } catch (error) {
    cli.error(error)
  }
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

  for await (const filepath of walkFiles(rootArticleDir)) {
    await processArticle(filepath, directories, options)
    processingCount++
    progressBar.update(processingCount)
  }

  progressBar.stop()
}
