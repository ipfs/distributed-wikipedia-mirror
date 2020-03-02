import { format } from 'date-fns'
import { readFileSync } from 'fs'
import Handlebars from 'handlebars'

import { EnhancedOpts } from './domain'

const footerFragment = readFileSync(
  './src/templates/footer_fragment.handlebars'
)

const generateFooterFrom = (options: EnhancedOpts) => {
  // const title = $html('title').text()

  const context = {
    SNAPSHOT_DATE: format(options.snapshotDate, 'yyyy-MM'),
    // ARTICLE_TITLE: encodeURIComponent(title),
    ARTICLE_URL: `https://${options.hostingDNSDomain}/wiki/${encodeURIComponent(
      options.relativeFilepath
    )}`,
    ARTICLE_URL_DISPLAY: `https://${options.hostingDNSDomain}/wiki/${options.relativeFilepath}`,
    IPNS_HASH: options.hostingIPNSHash,
    CANONICAL_URL: options.canonicalUrl,
    CANONICAL_URL_DISPLAY: decodeURIComponent(options.canonicalUrl),
    IMAGES_DIR: options.relativeImagePath,
    ZIM_URL:
      options.zimFileSourceUrl ??
      'https://wiki.kiwix.org/wiki/Content_in_all_languages'
  }

  const footerTemplate = Handlebars.compile(footerFragment.toString())

  const footer = footerTemplate(context)

  return footer
}

export const appendFooter = ($html: any, options: EnhancedOpts) => {
  const footer = generateFooterFrom(options)
  $html('#distribution-footer').remove()
  $html('#mw-mf-page-center').append(
    `<div id='distribution-footer'>${footer}</div>`
  )
}

export const appendHtmlPostfix = (href: string) => {
  const parts = href.split(/[#?]+/)

  if (parts.length === 0) {
    throw new Error('Unexpected parsing of links')
  }

  if (parts.length === 1) {
    if (href.endsWith('.html')) {
      return href
    }

    return `${href}.html`
  }

  if (parts[0].endsWith('.html')) {
    return href
  }

  return href.replace(parts[0], `${parts[0]}.html`)
}

export const prefixRelativeRoot = (href: string) => {
  if (!href.startsWith('/wiki/')) {
    return href
  }

  return href.replace('/wiki/', './')
}

export const moveRelativeLinksUpOneLevel = (href: string) => {
  return href.replace('../', '')
}

export const makeScriptLinksRelativeToWiki = (href: string) => {
  if (!href.startsWith('-/')) {
    return href
  }

  return `../${href}`
}

export const replaceANamespaceWithWiki = (href: string) => {
  return href.replace('/A/', '/wiki/')
}

export const reworkLinks = (
  $html: any,
  selector = 'a:not(.external)',
  fns: ((href: string) => string)[] = [
    replaceANamespaceWithWiki,
    appendHtmlPostfix
  ]
) => {
  const links = $html(selector)

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

export const reworkScriptSrcs = (
  $html: any,
  selector = 'a:not(.external)',
  fns: ((href: string) => string)[] = [
    replaceANamespaceWithWiki,
    appendHtmlPostfix
  ]
) => {
  const scripts = $html(selector)

  for (const script of Object.values<any>(scripts)) {
    const attribs = script.attribs

    if (!attribs || !attribs.src) {
      continue
    }

    let src = attribs.src

    for (const fn of fns) {
      src = fn(src)
    }

    attribs.src = src
  }
}
