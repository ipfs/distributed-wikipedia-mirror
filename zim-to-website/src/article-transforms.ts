import { format } from 'date-fns'
import Handlebars from 'handlebars'
import { readFileSync } from 'fs'
import { EnhancedOpts } from './domain'

const footerFragment = readFileSync('./src/footer_fragment.handlebars')

export const appendFooter = ($html: any, options: EnhancedOpts) => {
  const title = $html('title').text()

  const context = {
    SNAPSHOT_DATE: format(options.snapshotDate, 'yyyy-MM'),
    ARTICLE_TITLE: encodeURIComponent(title),
    ARTICLE_URL: `https://${options.host}/wiki/${encodeURIComponent(
      options.relativeFilepath
    )}`,
    ARTICLE_URL_DISPLAY: `https://${options.host}/wiki/${options.relativeFilepath}`,
    IPNS_HASH: options.ipnsHash,
    CANONICAL_URL: options.canonicalUrl,
    CANONICAL_URL_DISPLAY: decodeURIComponent(options.canonicalUrl),
    IMAGES_DIR: options.relativeImagePath,
    ZIM_URL: options.zimFile
      ? `http://download.kiwix.org/zim/${options.zimFile}`
      : 'https://wiki.kiwix.org/wiki/Content_in_all_languages'
  }

  const footerTemplate = Handlebars.compile(footerFragment.toString())

  const footer = footerTemplate(context)
  $html('#distribution-footer').remove()
  $html('#mw-mf-page-center').append(
    `<div id='distribution-footer'>${footer}</div>`
  )
}

export const appendHtmlPostfix = (href: string) => {
  if (href.endsWith('.html')) {
    return href
  }

  return `${href}.html`
}

export const moveRelativeLinksUpOneLevel = (href: string) => {
  return href.replace('../', '')
}

export const replaceANamespaceWithWiki = (href: string) => {
  return href.replace('/A/', '/wiki/')
}

export const reworkInternalLinks = (
  $html: any,
  fns: ((href: string) => string)[] = [
    replaceANamespaceWithWiki,
    appendHtmlPostfix
  ]
) => {
  const links = $html('a:not(.external)')

  for (const link of Object.values<any>(links)) {
    const attribs = link.attribs

    if (!attribs || !attribs.href) {
      continue
    }

    let href = attribs.href

    for (const fn of fns) {
      href = fn(href)
    }

    attribs.href = href
  }
}
