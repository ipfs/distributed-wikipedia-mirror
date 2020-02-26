import { Command, flags } from '@oclif/command'
import { zimToWebsite } from './zim-to-website'
import { Options } from './domain'

class ZimToWebsite extends Command {
  static description = 'describe the command here'

  static flags = {
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' })
  }

  static args = [{ name: 'unpackedZimDir', required: true }]

  async run() {
    const { args } = this.parse(ZimToWebsite)

    // const options: Options = {
    //   unpackedZimDir: args.unpackedZimDir,
    //   host: 'en.wikiquote-on-ipfs.org',
    //   ipnsHash: 'QmVH1VzGBydSfmNG7rmdDjAeBZ71UVeEahVbNpFQtwZK8W',
    //   zimFile: 'wikiquote_en_all_maxi_2020-02.zim',
    //   kiwixMainPage: 'Main_Page',
    //   mainPage: 'Main_Page.html'
    // }

    const options: Options = {
      unpackedZimDir: args.unpackedZimDir,
      host: 'tr.wikipedia-on-ipfs.org',
      ipnsHash: 'QmVH1VzGBydSfmNG7rmdDjAeBZ71UVeEahVbNpFQtwZK8W',
      zimFile: 'wikipedia_tr_all_maxi_2019-12.zim',
      kiwixMainPage: 'Kullanıcı:The_other_Kiwix_guy/Landing',
      mainPage: 'Anasayfa.html'
    }

    await zimToWebsite(options)
  }
}

export = ZimToWebsite
