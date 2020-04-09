#!/bin/bash

# internal

BASE=$(pwd -P)
CACHE="$BASE/.cache"

# conf

BASEURL="https://download.kiwix.org/zim/"

# ui funcs

log() {
  echo "$(date +%s): $*"
}

textmenu() { # allows the user to choose an id or item from a list
  echo
  a=($1) # turn $1 into an array
  [ -z "${a[1]}" ] && echo "Skipping question \"$2\" because there is only one choice: ${a[0]}" && res="${a[0]}" && return 0
  i=0
  for c in $1; do # build a list
    echo "[$i] $c"
    i=$(expr $i + 1)
  done
  [ -z "$3" ] && read -p "[?] $2 > " _id #if no element was specified as cli arg ask the user
  [ ! -z "$3" ] && _id="$3" #otherwise use that
  id=$(echo "$_id" | sed "s|[^0-9]||g") #only numbers
  for e in $1; do [ "$e" == "$_id" ] && res="$e" && echo "< $res" && return 0; done #check if item is in list
  res=${a[$id]}
  [ -z "$res" ] && [ ! -z "$3" ] && echo "Invalid ID or item: $3" && exit 2 #if id/item was specified via cli exit if invalid
  [ -z "$id" ] && [ -z "$_id" ] && textmenu "$1" "$2" && return 0 #no input
  [ -z "$id" ] && echo "Please enter a number or an item name" && textmenu "$1" "$2" && return 0
  [ -z "$res" ] && echo "INVALID ID" && textmenu "$1" "$2" && return 0
  echo "< $res" #show the choice to the user
}

# scraper fncs

fetch_with_cache() {
  OUTFILE=${1/"/"//"_"}
  OUTFILE="$CACHE/_page$OUTFILE"

  if [ -e "$OUTFILE" ]; then
    cat "$OUTFILE"
  else
    OUT=$(curl -sL "$BASEURL$1")
    mkdir -p "$CACHE"
    echo "$OUT" > "$OUTFILE"
    echo "$OUT"
  fi
}

get_urls() {
  grep href | grep -v "<pre>" | sed -E 's|.*href="(.*)".*|\1|g' | sed "s|/||g"
}

# main funcs

cmd_cache_update() {
  echo "Updating cache..."

  rm -rf "$CACHE"
  mkdir -p "$CACHE"
  for url in $(fetch_with_cache | get_urls); do
    echo "Updating cache for $url..."
    fetch_with_cache "$url" > /dev/null
  done
}

urlp() {
  # usage: get var
  # usage: filter type lang edition tags... date/"latest"

  case "$1" in
    get)
      get_var="$2"
      ;;
    filter)
      shift
      filter_type="$1"
      shift
      filter_lang="$1"
      shift
      filter_edition="$1"
      shift

      filter_tags=()
      while [ ! -z "$2" ]; do
        filter_tags+=("$1")
        shift
      done
      filter_tags="${filter_tags[*]}"

      if [ -z "$filter_tags" ]; then
        filter_tags="notag"
      fi

      if [ "$1" != "latest" ]; then
        filter_date="$1"
      fi
      shift
      ;;
  esac

  while read url; do
    type=""
    lang=""
    edition=""

    tags=()
    date=""

    for group in $(echo "$url" | sed "s|.zim||g" | tr "_" "\n"); do
      if [ -z "$type" ]; then
        type="$group"
      elif [ -z "$lang" ]; then
        lang="$group"
      elif [ -z "$edition" ]; then
        edition="$group"
      elif [[ "$group" == "20"* ]]; then
        date="$group"
      else
        tags+=("$group")
      fi
    done

    tags="${tags[*]}"

    if [ -z "$tags" ]; then
      tags="notag"
    fi

    if [ ! -z "$get_var" ]; then
      echo "${!get_var}"
    else
      if [ -z "$filter_type" ] || [[ "$filter_type" == "$type" ]]; then
        if [ -z "$filter_lang" ] || [[ "$filter_lang" == "$lang" ]]; then
          if [ -z "$filter_edition" ] || [[ "$filter_edition" == "$edition" ]]; then
            if [ -z "$filter_tags" ] || [[ "$filter_tags" == "$tags" ]]; then
              if [ -z "$filter_date" ] || [[ "$filter_date" == "$date" ]]; then
                echo "$url"
              fi
            fi
          fi
        fi
      fi
    fi

    # echo "type=$type, lang=$lang, edition=$edition, date=$date, tags=${tags[*]}"
  done
}

cmd_choose() {
  # Select wiki
  log "Getting wiki list..."
  wikis=$(fetch_with_cache | get_urls)
  textmenu "$wikis" "Select which wiki to mirror (choose 'other' for more)" "$1"
  wiki="$res"

  log "Getting sub-wiki list..."
  # there is a special case, "other", where multiple wikis are available
  reallist=$(fetch_with_cache "$wiki" | get_urls | urlp get type | uniq | wc -l)

  if [ "$reallist" != "1" ]; then
    wikireals=$(fetch_with_cache "$wiki" | get_urls | urlp get type | sort | uniq)
    textmenu "$wikireals" "Select which wiki to mirror" "$1"
    wikireal="$res"
  else
    wikireal="$wiki"
  fi

  log "Getting language list..."
  langs=$(fetch_with_cache "$wiki" | get_urls | grep "^${wikireal}_" | urlp get lang | sort | uniq)
  textmenu "$langs" "Select which language to mirror" "$2"
  lang="$res"

  log "Getting edition list..."
  editions=$(fetch_with_cache "$wiki" | get_urls | grep "^${wikireal}_${lang}" | urlp get edition | sort | uniq)
  textmenu "$editions" "Select which edition to mirror" "$3"
  edition="$res"

  log "Getting tag list..."
  tags=$(fetch_with_cache "$wiki" | get_urls | grep "^${wikireal}_${lang}_${edition}" | urlp get tags | sed "s| |_|g" | sort | uniq)
  textmenu "$tags" "Select which tags to use" "$4"
  tag="$res"

  if [ "$tag" != "notag" ]; then
    tagu="_$tag"
  fi

  log "Getting date list..."
  dates=$(fetch_with_cache "$wiki" | get_urls | grep "^${wikireal}_${lang}_${edition}${tagu}" | urlp get date | sort | uniq)
  dates="latest $dates"
  textmenu "$dates" "Select which date to mirror" "$5"
  date="$res"

  echo
  echo "  Download command:"
  echo "    \$ $0 download $wiki $wikireal $lang $edition $tag $date"
  echo

  while true; do
    read -p "Download [y/N]: " doit
    case "$doit" in
      y)
        cmd_download "$wiki" "$wikireal" "$lang" "$edition" "$tag" "$date"
        exit $?
        ;;
      n)
        exit 0
        ;;
    esac
  done
}

cmd_download_url() {
  wiki="$1"
  wikireal="$2"
  lang="$3"
  edition="$4"
  tag="$5"
  date="$6"

  tag=$(echo "$tag" | sed "s|_| |g")
  tag=($tag)

  log "Getting download URL..."
  URL=$(fetch_with_cache "$1" | get_urls | urlp filter "$wikireal" "$lang" "$edition" "${tag[@]}" "$date" | sort -s -r | head -n 1)

  if [ -z "$URL" ]; then
    echo "ERROR: Download URL not found. Possibly removed?" >&2
    exit 2
  fi

  URL="$BASEURL$wiki/$URL"

  log "URL: $URL"

  # below is a mixture of https://stackoverflow.com/a/19841872/3990041, my knowledge and guesswork :P
  SHA256=$(curl -sI "$URL" | grep digest | grep "SHA-256" | sed "s|digest: SHA-256=||g" | base64 -d | od -t x1 -An | tr "\n" " " | sed "s| ||g")

  log "SHA256: $SHA256"
}

cmd_url() {
  cmd_download_url "$@" >&2
  echo '{"url":"'"$URL"'","sha256":"'"$SHA256"'"}'
}

cmd_download() {
  cmd_download_url "$@"

  # real=$(curl -sLI $url | grep "^Location:"  | sed "s|Location: ||g" | grep "[a-zA-Z0-9\/:\._-]*" -o) #all the redirects
  OUTNAME=$(basename "$URL")

  dl_cycle() {
    log "Downloading $OUTNAME..."
    wget --continue -P ./snapshots "$URL"
    return $?
  }

  check_cycle() {
    log "Verifiying $OUTNAME..."
    sha256="$SHA256  ./snapshots/$OUTNAME"
    echo "$sha256" | sha256sum -c -
    return $?
  }

  if [ -e "$OUTNAME" ]; then
    if ! check_cycle; then
      if ! dl_cycle; then
        echo "Download failed! Check your network!"
      fi
      if ! check_cycle; then
        echo "It seems like your file is corrupted"
        echo "Please remove it:" # we won't do that because the user might not want this
        echo " \$ rm $OUTNAME"
      fi
    fi
  else
    if ! dl_cycle; then
      echo "Download failed! Check your network!"
    fi
    if ! check_cycle; then
      echo "It seems like your file is corrupted"
      echo "Please remove it:" # we won't do that because the user might not want this
      echo " \$ rm $OUTNAME"
    fi
  fi
}

if [ -n "$(LC_ALL=C type -t cmd_$1)" ] && [ "$(LC_ALL=C type -t cmd_$1)" = function ]; then
  CMD="$1"
  shift
  "cmd_$CMD" "$@"
  exit 0
else
  echo "Usage: $0 cache_update"
  echo "       $0 choose"
  echo "       $0 download/url <wiki> <wiki-real> <wiki-lang> <wiki-edition> <wiki-tag> <wiki-date>"
  exit 2
fi
