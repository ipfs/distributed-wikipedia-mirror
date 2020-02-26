export interface Options {
  unpackedZimDir: string
  hostingDNSDomain: string
  hostingIPNSHash: string
  kiwixMainPage: string
  mainPage: string
  zimFileDownloadUrl: string
}

export interface EnhancedOpts extends Options {
  snapshotDate: Date
  canonicalUrl: string
  relativeFilepath: string
  relativeImagePath: string
}

export interface Directories {
  unpackedZimDir: string
  articleFolder: string
  imagesFolder: string
  wikiFolder: string
}
