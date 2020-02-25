import { Directories, Options } from './domain'
import { readFileSync, writeFileSync } from 'fs'
import { relative } from 'path'
import cheerio from 'cheerio'
import { reworkInternalLinks, appendFooter } from './article-transforms'

export const processArticle = async (
  filepath: string,
  { wikiFolder }: Directories,
  options: Options
) => {
  const htmlBuffer = readFileSync(filepath)
  const html = htmlBuffer.toString()

  if (html.trim() === '') {
    return
  }

  const $html = cheerio.load(html)

  const canonicalUrl = $html('link[rel="canonical"]').attr('href')

  if (!canonicalUrl) {
    throw new Error(`Could not parse out canonical url for ${canonicalUrl}`)
  }

  const enhancedOpts = Object.assign(options, {
    snapshotDate: new Date(),
    relativeFilepath: relative(wikiFolder, filepath),
    canonicalUrl
  })

  reworkInternalLinks($html)
  appendFooter($html, enhancedOpts)

  writeFileSync(filepath, $html.html())
}
