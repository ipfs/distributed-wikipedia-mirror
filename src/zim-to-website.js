const {
  readdirSync,
  readFileSync,
  writeFileSync,
  lstatSync,
  copyFileSync,
  renameSync,
  existsSync
} = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const Handlebars = require('handlebars')
const { format } = require('date-fns')

const zimRootDir = './out'

const footerFragment = readFileSync('./src/footer_fragment.handlebars')
const indexRedirectFragment = readFileSync(
  './src/index_redirect_fragment.handlebars'
)

const articleFolder = path.join(zimRootDir, 'A')
const imagesFolder = path.join(zimRootDir, 'I', 'm')
const wikiFolder = path.join(zimRootDir, 'wiki')

const copyImageAssetsIntoWiki = async assetsDir => {
  const imagesFiles = readdirSync(assetsDir)

  for (const imageFile of imagesFiles) {
    const filepath = path.join(assetsDir, imageFile)
    const info = lstatSync(filepath)

    if (!info.isFile()) {
      return
    }

    imagesFolderPath = path.join(imagesFolder, imageFile)
    copyFileSync(filepath, imagesFolderPath)
  }
}

const moveArticleFolderToWiki = () => {
  if (existsSync(wikiFolder)) {
    return
  }

  renameSync(articleFolder, wikiFolder)
}

const insertIndexRedirect = options => {
  const template = Handlebars.compile(indexRedirectFragment.toString())

  const indexPath = path.join(zimRootDir, 'index.html')
  writeFileSync(
    indexPath,
    template({
      MAIN_PAGE: options.mainPage
    })
  )
}

const reworkInternalLinks = $html => {
  const links = $html('a:not(.external)')

  for (const link of Object.values(links)) {
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

const appendFooter = ($html, options) => {
  const title = $html('title').text()

  const context = {
    SNAPSHOT_DATE: format(options.snapshotDate, 'yyyy-MM'),
    ARTICLE_URL: `https://${options.host}/wiki/${encodeURIComponent(
      options.file
    )}`,
    IPNS_HASH: options.ipnsHash,
    ARTICLE_URL_DISPLAY: `https://${options.host}/wiki/${options.file}`,
    ARTICLE_TITLE: encodeURIComponent(title),

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

const main = async () => {
  const options = Object.assign(JSON.parse(readFileSync('./options.json')), {
    snapshotDate: new Date()
  })

  copyImageAssetsIntoWiki('./assets')
  moveArticleFolderToWiki()
  insertIndexRedirect(options)

  const articles = readdirSync(wikiFolder)

  console.log(`Processing ${articles.length} articles`)
  let count = 0
  articles.forEach(file => {
    const filepath = path.join(wikiFolder, file)
    const info = lstatSync(filepath)

    if (!info.isFile()) {
      return
    }

    const html = readFileSync(filepath)
    const $html = cheerio.load(html)

    const canonicalUrl = $html('link[rel="canonical"]').attr('href')

    reworkInternalLinks($html)
    appendFooter($html, Object.assign({}, options, { file, canonicalUrl }))

    writeFileSync(filepath, $html.html())
    count++

    if (count % 1000 === 0) {
      console.log('Processed ' + count)
    }
  })
}

main()
