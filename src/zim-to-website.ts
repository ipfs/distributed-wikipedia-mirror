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
import { checkUnpackedZimDir } from './utils/check-unpacked-zim-dir'

export const zimToWebsite = async (options: Options) => {
  const directories = resolveDirectories(options)

  checkUnpackedZimDir(options.unpackedZimDir)

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

  await processArticles(options, directories, cli)

  cli.log('done')
}
