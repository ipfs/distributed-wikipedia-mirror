import { cli } from 'cli-ux'

import { Options } from './domain'
import {
  appendJavscript as appendJavascript,
  includeSourceZim,
  copyImageAssetsIntoWiki,
  fixFavicon,
  fixExceptions,
  // generateMainPage,
  useKiwixLandingPage,
  insertIndexRedirect,
  moveArticleFolderToWiki,
  resolveDirectories
} from './site-transforms'
import { checkUnpackedZimDir } from './utils/check-unpacked-zim-dir'

export const zimToWebsite = async (options: Options) => {
  const directories = resolveDirectories(options)

  checkUnpackedZimDir(options.unpackedZimDir)

  cli.log('-------------------------')
  cli.log('Zim to Website Conversion')
  cli.log('-------------------------')
  cli.log(`  Unpacked Zim Directory: ${options.unpackedZimDir}`)
  cli.log(`                Zim File: ${options.zimFile}`)
  cli.log(`      Original Main Page: ${options.mainPage ? decodeURIComponent(options.mainPage) : null}`)
  cli.log(`         ZIM's Main Page: ${options.kiwixMainPage}`)

  if (options.hostingDNSDomain) {
    cli.log(`      Hosting DNS Domain: ${options.hostingDNSDomain}`)
  }

  if (options.hostingIPNSHash) {
    cli.log(`       Hosting IPNS Hash: ${options.hostingIPNSHash}`)
  }

  if (options.mainPageVersion) {
    cli.log(`       Main Page version: ${options.mainPageVersion}`)
  }

  cli.log('-------------------------')
  cli.log('')

  cli.log(`Starting zim to website conversion ...`)

  includeSourceZim(options)
  copyImageAssetsIntoWiki('./assets', directories)
  fixFavicon(directories)
  moveArticleFolderToWiki(directories)
  await fixExceptions(directories)
  insertIndexRedirect(options)
  appendJavascript(options, directories)
  await useKiwixLandingPage(options, directories)

  // usually main page from kiwix is ok, so we dont need below
  // await generateMainPage(options, directories)

  cli.log('done')
}
