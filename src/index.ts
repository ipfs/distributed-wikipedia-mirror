import { Command, flags } from '@oclif/command'

import { Options } from './domain'
import { zimToWebsite } from './zim-to-website'

class ZimToWebsite extends Command {
  static description = 'Convert unpacked zim files to usable websites'

  static examples = [
    '$ zim-to-website ./tmp \\\n  --hostingdnsdomain=tr.wikipedia-on-ipfs.org \\\n  --hostingipnshash=QmVH1VzGBydSfmNG7rmdDjAeBZ71UVeEahVbNpFQtwZK8W \\\n  --zimfiledownloadurl=https://download.kiwix.org/zim/wikipedia/wikipedia_tr_all_maxi_2019-12.zim \\\n  --kiwixmainpage=Kullanıcı:The_other_Kiwix_guy/Landing \\\n  --mainpage=Anasayfa.html'
  ]

  static flags = {
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),
    hostingdnsdomain: flags.string({
      required: true,
      description: 'the DNS domain the website will be hosted at'
    }),
    hostingipnshash: flags.string({
      required: true,
      description: 'the IPNS address the website will be hosted at on IPFS'
    }),
    zimfiledownloadurl: flags.string({
      required: true,
      description: 'the url of the original (before unpacking) zim file'
    }),
    kiwixmainpage: flags.string({
      required: true,
      description:
        'the main page as used by Kiwix and specified in the zim file'
    }),
    mainpage: flags.string({
      required: true,
      description:
        "the main page as it is on the approptiate wikimedia site, e.g. 'Anasayfa' for tr.wikipedia.org"
    }),
    mainpageversion: flags.integer({
      required: false,
      description: 'overrides the version of the homepage used'
    }),
    numberofworkerthreads: flags.integer({
      required: false,
      default: 6,
      description: 'overrides the number of worker threads'
    })
  }

  static args = [{ name: 'unpackedzimdir', required: true }]

  async run() {
    const { args, flags } = this.parse(ZimToWebsite)

    const options: Options = {
      unpackedZimDir: args.unpackedzimdir,
      hostingDNSDomain: flags.hostingdnsdomain,
      hostingIPNSHash: flags.hostingipnshash,
      zimFileDownloadUrl: flags.zimfiledownloadurl,
      kiwixMainPage: flags.kiwixmainpage,
      mainPage: flags.mainpage,
      mainPageVersion: flags.mainpageversion,
      noOfWorkerThreads: flags.numberofworkerthreads
    }

    await zimToWebsite(options)
  }
}

export = ZimToWebsite
