export interface Options {
  unpackedZimDir: string
  host: string
  ipnsHash: string
  kiwixMainPage: string
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
