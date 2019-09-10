#!/bin/bash

# internal

BASE=$(readlink -f $(dirname "$0"))
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
    echo "$OUT" > "$OUTFILE"
    echo "$OUT"
  fi
}

get_urls() {
  grep href | grep -v "<pre>" | sed -r 's|.*href="(.*)".*|\1|g' | sed "s|/||g"
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
  # usage: filter type lang edition tags... date/"any"

  case "$1" in
    get)
      get_var="$2"
      ;;
    filter)
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

      if [ "$1" != "any" ]; then
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

  log "Getting tag list.."
  tags=$(fetch_with_cache "$wiki" | get_urls | grep "^${wikireal}_${lang}_${edition}" | urlp get tags | sort | uniq)
  textmenu "$tags" "Select which tags to use" "$4"
  tag=$(echo "$res" | sed "s| |_|g")

  log "Getting date list..."
  dates=$(fetch_with_cache "$wiki" | get_urls | grep "^${wikireal}_${lang}_${edition}_${tag}" | urlp get date | sort | uniq)
  dates="any $dates"
  textmenu "$dates" "Select which date to mirror" "$5"
  date="$res"

  if [ "$wikireal" != "$wiki" ]; then
    wiki="$wiki $wikireal"
  fi

  echo "Download command:"
  echo "  \$ $0 download $wiki $lang $edition $tag $date"
}

cmd_download() {
  :
}

if [ -n "$(LC_ALL=C type -t cmd_$1)" ] && [ "$(LC_ALL=C type -t cmd_$1)" = function ]; then
  CMD="$1"
  shift
  "cmd_$CMD" "$@"
  exit 0
else
  echo "Usage: $0 cache_update"
  echo "       $0 choose"
  echo "       $0 download <wiki-type> <wiki-lang> <wiki-category> <wiki-edition> [<wiki-date>]"
  exit 2
fi




old() {
  #urls=$(echo "$html" | grep "Download" | grep "https://download.kiwix.org/zim/.*_all.zim\"" -o | grep "https://download.kiwix.org/zim/.*_all.zim" -o | uniq) #filter all urls

  #Select Wiki
  # wikis=$(echo "$urls" | grep "zim/.*_.*_all.zim" -o | grep "/[a-z]*_" -o | grep "[a-z]*" -o | uniq)

  fetch_with_cache "$wiki"

  #Select Language
  langs=$(echo "$urls" | grep "/${res}_.*" -o | grep -o "_.*_" | sed "s|^_||g" | sed "s|_$||g")
  textmenu "$langs" "Select which language to mirror" "$2"
  lang="$res"

  #Get URL
  url="https://download.kiwix.org/zim/${wiki}_${lang}_all.zim"
  urlverify=$(echo "$urls" | grep "$url")
  [ -z "$urlverify" ] && echo "INTERNAL ERROR: $url was not found in list but seems to be valid - Please report!" && exit 2

  echo
  echo "Wiki: $wiki, Language: $lang, Url: $url"

  [ -z "$*" ] && read -p "Press return to start downloading (this may take a long time)...
  " _foo

  md5=$(curl -sL $url.md5) #get the md5
  real=$(curl -sLI $url | grep "^Location:"  | sed "s|Location: ||g" | grep "[a-zA-Z0-9\/:\._-]*" -o) #all the redirects
  dest=$(basename $(echo "$real" | head -n 1)) #the real filename (includes date in filename, different from the one in the wiki)

  md5check() {
    echo
    echo "Verify md5 checksum..."
    md5sum -c > /dev/null 2> /dev/null << q
  $md5
  q
    e=$?
    if [ $e -ne 0 ]; then
      echo "md5sum FAILED!"
      if [ -z "$1" ]; then
        echo "Trying to continue the download..."
        echo
        wget --continue "$url" -O $dest
        echo
        md5check "r"
      else
        echo
        echo "It seems like your file is corrupted"
        echo "Please remove it:" #we won't do that because the user might not want this
        echo " $ rm $dest"
        exit 2
      fi
    else
      echo
      echo "Success! File saved as $dest"
    fi
  }

  if [ -e "$dest" ]; then
    echo "Skipping download, file already exists..."
    md5check
  else
    echo
    wget $url -O $dest
    echo
    md5check
  fi
}
