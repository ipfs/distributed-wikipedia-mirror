import { Command, flags } from '@oclif/command'
import { zimToWebsite } from './zim-to-website'

class ZimToWebsite extends Command {
  static description = 'describe the command here'

  static flags = {
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' })
  }

  static args = [{ name: 'unpackedZimDir', required: true }]

  async run() {
    const { args } = this.parse(ZimToWebsite)

    const options = {
      unpackedZimDir: args.unpackedZimDir,
      host: 'tr.wikipedia-on-ipfs.org',
      ipnsHash: 'QmVH1VzGBydSfmNG7rmdDjAeBZ71UVeEahVbNpFQtwZK8W',
      zimFile: 'wikipedia_tr_all_maxi_2019-12.zim',
      mainPage: 'Kullanıcı:The_other_Kiwix_guy/Landing'
    }

    await zimToWebsite(options)
  }
}

export = ZimToWebsite
