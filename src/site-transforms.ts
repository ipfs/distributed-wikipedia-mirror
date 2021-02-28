import cheerio from 'cheerio'
import { cli } from 'cli-ux'
import { format } from 'date-fns'
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  rmdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  closeSync,
  openSync,
  opendirSync,
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

export const fixFavicon = ({
  unpackedZimDir
}: Directories) => {
  const favicon = join(unpackedZimDir, '-', 'favicon')
  const faviconIco = join(unpackedZimDir, 'favicon.ico')
  if (existsSync(faviconIco) || !existsSync(favicon)) {
    return
  }

  cli.action.start('  Fixing favicon ')
  copyFileSync(favicon, faviconIco)
  cli.action.stop()
}


// Fix any broken redirects (https://github.com/openzim/zim-tools/issues/224)
export const fixRedirects = async ({
  unpackedZimDir,
  wikiFolder
}: Directories) => {
  const done = `${unpackedZimDir}/redirects_fixed`
  if (existsSync(done)) {
    return
  }

  cli.action.start('  Fixing redirects ')
  const fixupLog = `${unpackedZimDir}_redirect-fixups.log`
  if (existsSync(fixupLog)) {
    unlinkSync(fixupLog)
  }
  const output = process.env.DEBUG ? `>> ${fixupLog}` : '> /dev/null'
  const util = require('util')
  const exec = util.promisify(require('child_process').exec)
  // redirect files are smaller than 1k so we can skip bigger ones, making the performance acceptable
  const findRedirects = String.raw`find ${wikiFolder} -type f -size -800c -exec fgrep -l "0;url=A/" {} + -exec sed -i "s|0;url=A/|0;url=|" {} + ${output} || true`
  const { stdout, stderr } = await exec(findRedirects, {env: {'LC_ALL': 'C'}})
  if (!stderr) closeSync(openSync(done, 'w'))
  cli.action.stop()
  if (stdout) console.log('redirect fix stdout:', stdout)
  if (stderr) console.error('redirect fix stderr:', stderr)
}

// https://github.com/ipfs/distributed-wikipedia-mirror/issues/80
export const fixExceptions = async ({
  unpackedZimDir,
  wikiFolder
}: Directories) => {

  /* TODO this needs more work
  // Articles with "/" in namei like "foo/bar" produce conflicts and those are saved under
  // url-escaped flat-files in exceptions directory
  // What we do here is to take every "foo" exception and rename it to foo/index.html,
  // so it loads fine under own name
  const exceptionsDir = join(unpackedZimDir, '_exceptions')
  if (!existsSync(exceptionsDir)) {
    return
  }
  const dir = opendirSync(exceptionsDir)
  for await (let file of dir) {
    const articleName = decodeURIComponent(file.name)
    console.log(articleName)
    const segments = articleName.split('/')
    if (segments[0] !== 'A') continue
    segments[0] = 'wiki'

    const articleDir = join(unpackedZimDir, ...segments)
    if (!existsSync(articleDir)) {
      // problem:  articleDir may not exist and neither its parent,
      // and the root one is a file and not a dir (eg A/Australia/Foo/index.html blocked by A/Australia flat article)
      mkdirSync(articleDir, { recursive: true })
    }
    const articleSrc = join(exceptionsDir, file.name)
    const articleDest = join(articleDir, 'index.html')
    renameSync(articleSrc, articleDest)
  }
  */
  // TODO: remove _exceptions?
}

export const includeSourceZim = ({
  zimFile,
  unpackedZimDir
}: Options) => {
  const zimCopy = join(unpackedZimDir, basename(zimFile))
  if (existsSync(zimCopy)) {
    return
  }

  cli.action.start('  Copying source ZIM to the root of unpacked zim directory ')
  copyFileSync(zimFile, zimCopy)
  cli.action.stop()
}

export const insertIndexRedirect = (options: Options) => {
  cli.action.start("  Inserting root 'index.html' as redirect to main page")
  const template = Handlebars.compile(indexRedirectFragment.toString())

  const indexPath = join(options.unpackedZimDir, 'index.html')
  const wikiIndexPath = join(options.unpackedZimDir, 'wiki', 'index.html')

  if (existsSync(indexPath)) {
    unlinkSync(indexPath)
  }

  writeFileSync(
    indexPath,
    template({
      MAIN_PAGE: 'wiki/'
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


// This is usually not used nor needed, but we keep this code around
// in case we need to generate some language quickly and there is a bug in ZIM
// that makes main page unusable.
// With this, we are able to fetch corresponding revision from upstream wikipedia
// and replace ZIM article with upstream one + fixup links and images.
// (This is no longer needed for most ZIMs after we switched to upstream zim-tools)
/*
export const generateMainPage = async (
  options: Options,
  { wikiFolder, imagesFolder }: Directories
) => {


  // We copy "kiwix main page" to /wiki/index.html
  // This way original one can still be loaded if needed
  // Example for tr:
  // /wiki/index.html is https://tr.wikipedia.org/wiki/Kullanıcı:The_other_Kiwix_guy/Landing
  // /wiki/Anasayfa is https://tr.wikipedia.org/wiki/Anasayfa
  const mainPagePath = join(wikiFolder, 'index.html')

  cli.action.start(`  Generating main page into ${mainPagePath} `)

  const kiwixMainPageSrc = join(wikiFolder, `${options.kiwixMainPage}`)

  // This is a crude fix that replaces exploded dir with single html
  // just to fix main pages that happen to end up in _exceptions.
  // A proper fix is needed for regular articles:  https://github.com/ipfs/distributed-wikipedia-mirror/issues/80
  if (lstatSync(kiwixMainPageSrc).isDirectory()) {
    const exceptionsPage = join(options.unpackedZimDir, '_exceptions', `A%2f${options.kiwixMainPage}`)
    if (existsSync(exceptionsPage)) {
      rmdirSync(kiwixMainPageSrc, { recursive: true })
      renameSync(exceptionsPage, kiwixMainPageSrc)
    }
  }

  const kiwixMainpage = readFileSync(kiwixMainPageSrc)

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
*/

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
