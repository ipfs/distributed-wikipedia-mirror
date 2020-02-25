import { cli } from 'cli-ux'

import {
  resolveDirectories,
  copyImageAssetsIntoWiki,
  moveArticleFolderToWiki,
  insertIndexRedirect,
  generateMainPage,
  processArticles
} from './site-transforms'
import { Options } from './domain'

export const zimToWebsite = async (options: Options) => {
  const directories = resolveDirectories(options)

  cli.log(`Reading unpacked zim directory ${options.unpackedZimDir}`)

  copyImageAssetsIntoWiki('./assets', directories)
  moveArticleFolderToWiki(directories)
  insertIndexRedirect(options)
  await generateMainPage(options, directories, cli)

  await processArticles(options, directories, cli)
}
