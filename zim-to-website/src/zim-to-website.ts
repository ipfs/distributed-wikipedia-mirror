import { readdirSync } from 'fs'

import { cli } from 'cli-ux'
import walkFiles from './utils/walk-files'
import { processArticle } from './process-article'
import {
  resolveDirectories,
  copyImageAssetsIntoWiki,
  moveArticleFolderToWiki,
  insertIndexRedirect
} from './site-transforms'

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

export interface Directories {
  unpackedZimDir: string
  articleFolder: string
  imagesFolder: string
  wikiFolder: string
}

export const zimToWebsite = async (options: Options) => {
  cli.log(`Reading unpacked zim directory ${options.unpackedZimDir}`)

  const directories = resolveDirectories(options)
  const { articleFolder, imagesFolder, wikiFolder } = directories

  copyImageAssetsIntoWiki('./assets', imagesFolder)
  moveArticleFolderToWiki(articleFolder, wikiFolder)
  insertIndexRedirect(options)

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
