export interface Options {
  unpackedZimDir: string
  kiwixMainPage: string
  mainPage: string
  mainPageVersion?: number
  hostingDNSDomain?: string
  hostingIPNSHash?: string
  zimFile: string
  noOfWorkerThreads: number
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
  jsmodulesFolder: string
}

export type ArticleWorkerData = {
  options: Options
  directories: Directories
}

export enum MessageRequestTypes {
  EXIT = 'EXIT',
  PROCESS_ARTICLES = 'PROCESS_ARTICLES'
}

export enum MessageResponseTypes {
  PROCESSED_ARTICLES = 'PROCESSED_ARTICLES',
  READY = 'READY'
}
