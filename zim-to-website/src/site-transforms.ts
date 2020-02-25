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
import {
  reworkInternalLinks,
  moveRelativeLinksUpOneLevel,
  appendHtmlPostfix,
  replaceANamespaceWithWiki,
  appendFooter
} from './article-transforms'

const indexRedirectFragment = readFileSync(
  './src/index_redirect_fragment.handlebars'
)

export const copyImageAssetsIntoWiki = async (
  assetsDir: string,
  { imagesFolder }: Directories
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

export const moveArticleFolderToWiki = ({
  articleFolder,
  wikiFolder
}: Directories) => {
  if (existsSync(wikiFolder)) {
    return
  }

  renameSync(articleFolder, wikiFolder)
}

export const insertIndexRedirect = (options: Options) => {
  const template = Handlebars.compile(indexRedirectFragment.toString())

  const indexPath = join(options.unpackedZimDir, 'index.html')
  writeFileSync(
    indexPath,
    template({
      MAIN_PAGE: options.mainPage
    })
  )
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

export const processArticles = async (
  options: Options,
  directories: Directories,
  cli: any
) => {
  const { wikiFolder } = directories
  const rootArticleDir = join(wikiFolder, '12')

  let totalArticleCount = 0
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const _filepath of walkFiles(rootArticleDir)) {
    totalArticleCount++
  }

  const progressBar = cli.progress()

  let processingCount = 0
  progressBar.start(totalArticleCount, processingCount)

  for await (const filepath of walkFiles(rootArticleDir)) {
    await processArticle(filepath, directories, options)
    processingCount++
    progressBar.update(processingCount)
  }

  progressBar.stop()
}

export const generateMainPage = (
  options: Options,
  { wikiFolder, imagesFolder }: Directories
) => {
  const kiwixMainpage = readFileSync(
    join(wikiFolder, `${options.kiwixMainPage}.html`)
  )

  const mainPagePath = join(wikiFolder, options.mainPage)

  const $html = cheerio.load(kiwixMainpage.toString())

  const canonicalUrlString = $html('link[rel="canonical"]').attr('href')

  if (!canonicalUrlString) {
    throw new Error(
      `Could not parse out canonical url for ${canonicalUrlString}`
    )
  }

  const canonicalUrl = new URL(canonicalUrlString)
  canonicalUrl.pathname = `wiki/${options.mainPage.replace('.html', '')}`

  const enhancedOpts: EnhancedOpts = Object.assign(options, {
    snapshotDate: new Date(),
    relativeFilepath: relative(wikiFolder, mainPagePath),
    relativeImagePath: relative(mainPagePath, imagesFolder),
    canonicalUrl: canonicalUrl.href
  })

  reworkInternalLinks($html, [
    moveRelativeLinksUpOneLevel,
    replaceANamespaceWithWiki,
    appendHtmlPostfix
  ])

  appendFooter($html, enhancedOpts)

  writeFileSync(mainPagePath, $html.html())
}
