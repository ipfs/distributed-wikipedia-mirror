import { cli } from 'cli-ux'
import { existsSync, lstatSync } from 'fs'

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

  if (!existsSync(options.unpackedZimDir)) {
    throw new Error(
      `Unpacked Zim Directory does not exist: ${options.unpackedZimDir}`
    )
  }

  if (!lstatSync(options.unpackedZimDir).isDirectory()) {
    throw new Error(`Unpacked Zim Directory must be a directory`)
  }

  cli.log('-------------------------')
  cli.log('Zim to Website Conversion')
  cli.log('-------------------------')
  cli.log(`  Unpacked Zim Directory: ${options.unpackedZimDir}`)
  cli.log(`   Zim File Download Url: ${options.zimFileDownloadUrl}`)
  cli.log(`      Hosting DNS Domain: ${options.hostingDNSDomain}`)
  cli.log(`       Hosting IPNS Hash: ${options.hostingIPNSHash}`)
  cli.log(`               Main Page: ${options.mainPage}`)
  cli.log(`         Kiwix Main Page: ${options.kiwixMainPage}`)
  cli.log('-------------------------')
  cli.log('')

  cli.log(`Starting zim to website conversion ...`)

  copyImageAssetsIntoWiki('./assets', directories)
  moveArticleFolderToWiki(directories)
  insertIndexRedirect(options)
  await generateMainPage(options, directories)

  return
  await processArticles(options, directories, cli)

  cli.log('done')
}
