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
import cheerio from 'cheerio'
import Handlebars from 'handlebars'
import { format } from 'date-fns'
import { cli } from 'cli-ux'
import walkFiles from './utils/walkFiles'

const footerFragment = readFileSync('./src/footer_fragment.handlebars')
const indexRedirectFragment = readFileSync(
  './src/index_redirect_fragment.handlebars'
)

export interface Options {
  unpackedZimDir: string
  host: string
  ipnsHash: string
  mainPage: string
  zimFile: string
}

export interface EnhancedOpts extends Options {
  snapshotDate: Date
  canonicalUrl: string
  relativeFilepath: string
}

const copyImageAssetsIntoWiki = async (
  assetsDir: string,
  imagesFolder: string
) => {
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
}

const moveArticleFolderToWiki = (articleFolder: string, wikiFolder: string) => {
  if (existsSync(wikiFolder)) {
    return
  }

  renameSync(articleFolder, wikiFolder)
}

const insertIndexRedirect = (options: Options) => {
  const template = Handlebars.compile(indexRedirectFragment.toString())

  const indexPath = join(options.unpackedZimDir, 'index.html')
  writeFileSync(
    indexPath,
    template({
      MAIN_PAGE: options.mainPage
    })
  )
}

const reworkInternalLinks = ($html: any) => {
  const links = $html('a:not(.external)')

  for (const link of Object.values<any>(links)) {
    const attribs = link.attribs

    if (!attribs || !attribs.href) {
      continue
    }

    if (attribs.href.endsWith('.html')) {
      continue
    }

    attribs.href = `${attribs.href}.html`
  }
}

const appendFooter = ($html: any, options: EnhancedOpts) => {
  const title = $html('title').text()

  const context = {
    SNAPSHOT_DATE: format(options.snapshotDate, 'yyyy-MM'),
    ARTICLE_TITLE: encodeURIComponent(title),
    ARTICLE_URL: `https://${options.host}/wiki/${encodeURIComponent(
      options.relativeFilepath
    )}`,
    ARTICLE_URL_DISPLAY: `https://${options.host}/wiki/${options.relativeFilepath}`,
    IPNS_HASH: options.ipnsHash,
    CANONICAL_URL: options.canonicalUrl,
    CANONICAL_URL_DISPLAY: decodeURIComponent(options.canonicalUrl),
    ZIM_URL: options.zimFile
      ? `http://download.kiwix.org/zim/${options.zimFile}`
      : 'https://wiki.kiwix.org/wiki/Content_in_all_languages'
  }

  const footerTemplate = Handlebars.compile(footerFragment.toString())

  const footer = footerTemplate(context)
  $html('#distribution-footer').remove()
  $html('#mw-mf-page-center').append(
    `<div id='distribution-footer'>${footer}</div>`
  )
}

export const zimToWebsite = async (options: Options) => {
  const articleFolder = join(options.unpackedZimDir, 'A')
  const imagesFolder = join(options.unpackedZimDir, 'I', 'm')
  const wikiFolder = join(options.unpackedZimDir, 'wiki')

  copyImageAssetsIntoWiki('./assets', imagesFolder)
  moveArticleFolderToWiki(articleFolder, wikiFolder)
  insertIndexRedirect(options)

  const articles = readdirSync(wikiFolder)

  const progressBar = cli.progress()

  let count = 0
  progressBar.start(articles.length, count)

  for await (const filepath of walkFiles(wikiFolder)) {
    const htmlBuffer = readFileSync(filepath)
    const html = htmlBuffer.toString()

    if (html.trim() === '') {
      continue
    }

    const $html = cheerio.load(html)

    const canonicalUrl = $html('link[rel="canonical"]').attr('href')

    if (!canonicalUrl) {
      throw new Error(`Could not parse out canonical url for ${canonicalUrl}`)
    }

    const enhancedOpts = Object.assign(options, {
      snapshotDate: new Date(),
      relativeFilepath: relative(wikiFolder, filepath),
      canonicalUrl
    })

    reworkInternalLinks($html)
    appendFooter($html, enhancedOpts)

    writeFileSync(filepath, $html.html())

    count++
    progressBar.update(count)
  }

  progressBar.stop()
}
