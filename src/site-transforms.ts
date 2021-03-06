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
  moveRelativeLinksDownOneLevel,
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

// https://github.com/ipfs/distributed-wikipedia-mirror/issues/80
export const fixExceptions = async ({
  unpackedZimDir,
  wikiFolder
}: Directories) => {

  /*
    for every FOO directory in wiki/FOO
      find article _exceptions/A%2fFOO
        if exists, move it to wiki/FOO/index.html

    for every file matching _exceptions/A%2f*
      split name into segments
        for each but the last segment
          check if wiki/FOO exists,
            if exists and is a directory, do nothing
            if does not exist, create a dir
            if exists, but is a file, replace file with a dir, and move file to  FOO/index.html
        finally, write last segment under wiki/FOO/bar
  */

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
    let articleName
    try {
      articleName = decodeURIComponent(file.name)
    } catch (e) {
      console.error(`[fixExceptions] unable to decodeURIComponent(${file.name}), skipping `)
      continue
    }
    const segments = articleName.split('/')

    // only process exceptions from A/ namespace
    if (segments[0] !== 'A') continue
    segments.shift() // remove A/

    // only process exceptions where segments have 1+ length
    // and can be represented as directories
    if (!segments.length || segments.some(s => !s.length)) continue

    // console.log('processing: ' + articleName)
    const suffixFile = segments.pop() || ''

    // creation of index.html breaks links created by zimdump:
    // needs manual adjustment of relative links to be prefixed with ../
    const fixRelativeLinks = (filePath: string, depth: number) => {
      const fileBytes = readFileSync(filePath)
      const $fileHtml = cheerio.load(fileBytes.toString())

      const linkFixups = Array.from({ length: depth }, (x, i) => moveRelativeLinksDownOneLevel)
      reworkLinks($fileHtml, 'a:not(a[href^="http"]):not(a[href^="//"])', linkFixups)
      reworkLinks($fileHtml, 'link[href^="../"]', linkFixups)
      reworkScriptSrcs($fileHtml, 'img', linkFixups)
      reworkScriptSrcs($fileHtml, 'script', linkFixups)

      // console.log(`    fixed relative paths in ${filePath}`)
      // renameSync(filePath, `${filePath}.original`)
      writeFileSync(filePath, $fileHtml.html())
    }

    // if article is not A/foo but A/FOO/bar parent dirs need to be inspected
    if (segments.length) {
      // ensure dir at each level exists and has no conflict
      for (let i = 1; i < segments.length+1; i++) {
        const parentDir = join(wikiFolder, ...segments.slice(0,i))
        // console.log(' checking parentDir: ' + parentDir)
        if (existsSync(parentDir)) {
          if (lstatSync(parentDir).isFile()) {
            // If a file exists under the name of a directory we need,
            // move file into a newly created dir
            const articleTmp = `${parentDir}.tmp`
            const articleDst = join(parentDir, 'index.html')
            // console.log(`  parentDir is a file, renaming to ${articleDst}`)
            renameSync(parentDir, articleTmp)
            mkdirSync(parentDir, { recursive: true })
            renameSync(articleTmp, articleDst)
            fixRelativeLinks(articleDst, i)
          }
        } else {
          // console.log(`  created parentDir`)
          mkdirSync(parentDir, { recursive: true })
        }
      }
    }

    const articleSrc = join(exceptionsDir, file.name)
    const articleDir = join(wikiFolder, ...segments)
    const articleDst = join(articleDir, suffixFile)

    // console.log(` renaming ${articleSrc}`)

    if (existsSync(articleDst) && lstatSync(articleDst).isDirectory()) {
        // console.log(`  directory already, renaming to ${articleDst}/index.html`)
        const movedArticleDst = join(articleDst, 'index.html')
        renameSync(articleSrc, movedArticleDst)
        fixRelativeLinks(movedArticleDst, 1)
      } else {
        // console.log(`  renamed to ${articleDst}`)
        renameSync(articleSrc, articleDst)
      }
    }
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

  // note that this is temporary stub, we most likely
  // override this template with a better landing during later steps
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

// Gets path to an article after unpacking and fixExceptions fixups
const unpackedArticlePath = (wikiFolder: string, article: string) => {
  let articlePath = join(wikiFolder, article)
  if (!existsSync(articlePath)) throw new Error(`unpacked '/wiki/${article}' is missing`)
  if (lstatSync(articlePath).isDirectory()) {
    const fixedSrc = join(articlePath, 'index.html')
    if (existsSync(fixedSrc)) {
      return fixedSrc
    } else {
      throw new Error(`unpacked '/wiki/${article}' is a dir without index.html`)
    }
  }
  return articlePath
}


// We copy "kiwix main page" to /wiki/index.html + adjust links.
// This way original one can still be loaded if needed
// Example for tr:
// /wiki/index.html is https://tr.wikipedia.org/wiki/Kullanıcı:The_other_Kiwix_guy/Landing
// /wiki/Anasayfa is https://tr.wikipedia.org/wiki/Anasayfa
export const useKiwixLandingPage = async (
  options: Options,
  { wikiFolder, imagesFolder }: Directories
) => {

  cli.action.start(`  Generating landing page at /wiki/ from Kiwix one at /wiki/${options.kiwixMainPage}`)

  const landingPagePath = join(wikiFolder, 'index.html')
  const kiwixMainPageSrc = unpackedArticlePath(wikiFolder, options.kiwixMainPage)

  // Use main page from Kiwix as the landing:
  // In most cases it is already the best landing available
  copyFileSync(kiwixMainPageSrc, landingPagePath)

  // Tweak page title of custom landing created by The_other_Kiwix_guy :-)
  if (kiwixMainPageSrc.includes('The_other_Kiwix_guy')) {
    // Set title to one from canonical main page
    const $landingHtml = cheerio.load(readFileSync(landingPagePath).toString())
    const canonicalUrlString = $landingHtml('link[rel="canonical"]').attr('href')
    if (!canonicalUrlString) {
      throw new Error(`Could not parse out canonical url for ${canonicalUrlString}`)
    }
    const canonicalUrl = new URL(canonicalUrlString)
    canonicalUrl.pathname = `wiki/${options.mainPage}`
    const response = await fetch(canonicalUrl)
    const pageBody = await response.text()
    const $remoteMainPageHtml = cheerio.load(pageBody)
    const pageTitle = $remoteMainPageHtml('title').text()
    $landingHtml('title').text(pageTitle)
    writeFileSync(landingPagePath, $landingHtml.html())
  }

  // Fixup relative paths, if needed
  const depth = (options.kiwixMainPage.match(/\//g) || []).length
  if (depth) {
    const fixRelativeLinksUp = (filePath: string, depth: number) => {
      const fileBytes = readFileSync(filePath)
      const $fileHtml = cheerio.load(fileBytes.toString())

      const linkFixups = Array.from({ length: depth }, (x, i) => moveRelativeLinksUpOneLevel)
      reworkLinks($fileHtml, 'a:not(a[href^="http"]):not(a[href^="//"])', linkFixups)
      reworkLinks($fileHtml, 'link[href^="../"]', linkFixups)
      reworkScriptSrcs($fileHtml, 'img', linkFixups)
      reworkScriptSrcs($fileHtml, 'script', linkFixups)

      // console.log(`    fixed relative paths in ${filePath}`)
      // renameSync(filePath, `${filePath}.original`)
      writeFileSync(filePath, $fileHtml.html())
    }
    fixRelativeLinksUp(landingPagePath, depth)
  }

  cli.action.stop()
}

// This is usually not used nor needed, but we keep this code around
// in case we need to generate some language quickly and there is a bug in ZIM
// that makes main page unusable.
// With this, we are able to fetch corresponding revision from upstream wikipedia
// and replace ZIM article with upstream one + fixup links and images.
// (This is no longer needed for most ZIMs after we switched to upstream zim-tools)
/*
export const fetchOriginalMainPage = async (
  options: Options,
  { wikiFolder, imagesFolder }: Directories
) => {


  // We copy "kiwix main page" to /wiki/index.html
  // This way original one can still be loaded if needed
  // Example for tr:
  // /wiki/index.html is https://tr.wikipedia.org/wiki/Kullanıcı:The_other_Kiwix_guy/Landing
  // /wiki/Anasayfa is https://tr.wikipedia.org/wiki/Anasayfa
  const mainPagePath = join(wikiFolder, 'index.html')

  cli.action.start(`  Generating main page into /wiki/`)

  let kiwixMainPageSrc = join(wikiFolder, `${options.kiwixMainPage}`)

  // Handle namespace conflicts resolved in fixExceptions step
  if (lstatSync(kiwixMainPageSrc).isDirectory()) {
    const fixedSrc = `${kiwixMainPageSrc}/index.html`
    if (existsSync(fixedSrc)) {
      kiwixMainPageSrc = fixedSrc
    } else {
      throw new Error(`kiwixMainPageSrc "${kiwixMainPageSrc}" is a dir without index.html`)
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
    const remotePageTitle = $remoteMainPageHtml('title').text().replace(':The other Kiwix guy/', '')

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
