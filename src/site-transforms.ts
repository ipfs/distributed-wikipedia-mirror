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
  unlinkSync,
  writeFileSync
} from 'fs'
import Handlebars from 'handlebars'
import fetch from 'node-fetch'
import path from 'path'
import { join, basename, relative } from 'path'

import {
  appendHtmlPostfix,
  makeScriptLinksRelativeToWiki,
  moveRelativeLinksUpOneLevel,
  prefixRelativeRoot,
  reworkLinks,
  reworkScriptSrcs
} from './article-transforms'
import { Directories, Options } from './domain'
import { downloadFile } from './utils/download-file'

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

export const includeSourceZim = ({
  zimFile,
  unpackedZimDir
}: Options) => {
  const zimCopy = join(unpackedZimDir, basename(zimFile))
  if (existsSync(zimCopy)) {
    return
  }

  cli.action.start('  Copying source ZIM to the root of unpacked version ')
  copyFileSync(zimFile, zimCopy)
  cli.action.stop()
}

export const insertIndexRedirect = (options: Options) => {
  cli.action.start("  Inserting root 'index.html' as redirect to main page")
  const template = Handlebars.compile(indexRedirectFragment.toString())

  const indexPath = join(options.unpackedZimDir, 'index.html')
  const wikiIndexPath = join(options.unpackedZimDir, 'wiki', 'index.html')

  writeFileSync(
    indexPath,
    template({
      MAIN_PAGE: `wiki/${options.mainPage}`
    })
  )

  if (existsSync(wikiIndexPath)) {
    unlinkSync(wikiIndexPath)
  }

  writeFileSync(
    wikiIndexPath,
    template({
      MAIN_PAGE: `./${options.mainPage}`
    })
  )

  cli.action.stop()
}

export const resolveDirectories = (options: Options) => {
  const articleFolder = join(options.unpackedZimDir, 'A')
  const imagesFolder = join(options.unpackedZimDir, 'I')
  const wikiFolder = join(options.unpackedZimDir, 'wiki')
  const jsmodulesFolder = join(options.unpackedZimDir, '-')

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
  { wikiFolder, imagesFolder }: Directories
) => {
  const kiwixMainpage = readFileSync(
    join(wikiFolder, `${options.kiwixMainPage}`)
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

  canonicalUrl.searchParams.set('oldid', canonicalPageVersionid)

  try {
    const response = await fetch(canonicalUrl)
    const pageBody = await response.text()
    const $remoteMainPageHtml = cheerio.load(pageBody)

    const $remoteContent = $remoteMainPageHtml('#content')
    const remotePageTitle = $remoteMainPageHtml('title').text()

    $remoteContent.addClass('content')
    $remoteContent.find('#siteNotice').remove()
    $remoteContent.find('#firstHeading').remove()
    $remoteContent.find('#siteSub').remove()
    $remoteContent.find('#contentSub').remove()
    $remoteContent.find('#catlinks').remove()
    $remoteContent.find('#mw-fr-revisiontag-old').remove()
    $remoteContent.find('a.mw-jump-link').remove()
    $remoteContent.find('#mc0').remove()

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
        'background-image: url("../I/wikipedia-on-ipfs.png"); background-repeat:no-repeat; background-position:-20px -40px; background-size: 200px; width:100%; border:1px solid #a7d7f9; vertical-align:top;'
      )

    // Copy image downloads
    const $externalImages = $remoteContent.find(
      'img[src*="upload.wikimedia.org"]'
    )

    for (const $externalImage of $externalImages.toArray()) {
      const src = $externalImage.attribs.src
      const filename = path.basename(src)

      // eslint-disable-next-line no-await-in-loop
      await downloadFile(
        new URL(`http:${src}`),
        join(imagesFolder, decodeURIComponent(filename))
      )
      $externalImage.attribs.src = `../I/${filename}`
      delete $externalImage.attribs.srcset
    }

    const $kiwixNote = $kiwixMainPageHtml('#mw-content-text > div:last-child')

    $remoteContent.find('#mw-content-text').append($kiwixNote)

    // Add title from remote main page
    $kiwixMainPageHtml('title').text(remotePageTitle)

    $kiwixMainPageHtml('#content').remove()
    $kiwixMainPageHtml('#mw-mf-page-center').prepend($remoteContent)

    // Updage the article issuing link at the bottom
    $kiwixMainPageHtml('a')
      .filter((_, elem) => {
        // console.log(elem.attribs?.href)
        return elem.attribs?.href?.includes('oldid')
      })
      .first()
      .attr('href', canonicalUrl.href)

    // Update the canoncial url from the remote main page (without oldid)
    canonicalUrl.searchParams.delete('oldid')
    $kiwixMainPageHtml('link[rel="canonical"]').attr('href', canonicalUrl.href)

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

  const delimiter = '/* Appended by Distributed Wikipedia Mirror – details at https://github.com/ipfs/distributed-wikipedia-mirror */'
  const targetSiteJsFile = join(jsmodulesFolder, 'mw', 'site.js')

  const dwmSitejsTemplate = readFileSync('./src/templates/site.js.handlebars')
    .toString()
    .replace('<script>', '')
    .replace('</script>', '')

  const context = {
    SNAPSHOT_DATE: format(new Date(), 'yyyy-MM'),
    HOSTING_IPNS_HASH: options.hostingIPNSHash,
    HOSTING_DNS_DOMAIN: options.hostingDNSDomain,
    ZIM_NAME: basename(options.zimFile)
  }

  const dwmSitejs = Handlebars.compile(dwmSitejsTemplate.toString())({
    FOOTER_TEMPLATE: footerFragment
      .toString()
      .replace(/\n/g, '\\\n')
      .replace(/"/g, '\\"'),
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
  const targetJsConfigVarFile = join(jsmodulesFolder, 'mw', 'jsConfigVars.js')
  writeFileSync(targetJsConfigVarFile, '{}')

  // hack replace the unexpected var in startup.js
  const startupJsFile = join(jsmodulesFolder, 'mw', 'startup.js')
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
  for (const file of ['ext.cite.ux-enhancements.js']) {
    const filepath = join(jsmodulesFolder, 'mw', file)
    const overwriteText =
      '/* Overwritten by Distributed Wikipedia Mirror to prevent js errors, see https://github.com/openzim/mwoffliner/issues/894 */'
    writeFileSync(filepath, overwriteText)
  }

  cli.action.stop()
}
