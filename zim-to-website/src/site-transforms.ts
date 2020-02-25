import {
  readdirSync,
  readFileSync,
  writeFileSync,
  lstatSync,
  copyFileSync,
  renameSync,
  existsSync
} from 'fs'
import { join } from 'path'
import Handlebars from 'handlebars'
import { Options, Directories } from './domain'
import walkFiles from './utils/walk-files'
import { processArticle } from './process-article'

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
  const articles = readdirSync(wikiFolder)

  const progressBar = cli.progress()

  let count = 0
  progressBar.start(articles.length, count)

  for await (const filepath of walkFiles(wikiFolder)) {
    await processArticle(filepath, directories, options)
    count++
    progressBar.update(count)
  }

  progressBar.stop()
}
