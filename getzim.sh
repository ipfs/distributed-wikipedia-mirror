#!/bin/bash

if [ ! -e ".content" ]; then
  echo "Downloading content list..."
  curl -s http://wiki.kiwix.org/wiki/Content_in_all_languages > .content
fi
html=$(cat .content)
urls=$(echo "$html" | grep "Download" | grep "http://download.kiwix.org/zim/.*_all.zim\"" -o | grep "http://download.kiwix.org/zim/.*_all.zim" -o | uniq) #filter all urls

textmenu() { #allows the user to choose an id or item from a list
  echo
  a=($1) #turn $1 into an array
  [ -z "${a[1]}" ] && echo "Skipping question \"$2\" because there is only one choice: ${a[0]}" && res="${a[0]}" && return 0
  i=0
  for c in $1; do #build a list
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
  [ -z "$id" ] && echo "Please enter a number or what you want" && textmenu "$1" "$2" && return 0
  [ -z "$res" ] && echo "INVALID ID" && textmenu "$1" "$2" && return 0
  echo "< $res" #show the choice to the user
}

#Select Source
srcs=$(echo "$urls" | grep "zim/.*_.*_all.zim" -o | grep "/[a-z]*_" -o | grep "[a-z]*" -o | uniq)
textmenu "$srcs" "Select which source to mirror" "$1"
src="$res"

#Select Language
langs=$(echo "$urls" | grep "/${res}_.*" -o | grep -o "_.*_" | sed "s|^_||g" | sed "s|_$||g")
textmenu "$langs" "Select which language to mirror" "$2"
lang="$res"

#Get URL
url="http://download.kiwix.org/zim/${src}_${lang}_all.zim"
urlverify=$(echo "$urls" | grep "$url")
[ -z "$urlverify" ] && echo "INTERNAL ERROR: $url was not found in list but seems to be valid - Please report!" && exit 2

echo
echo "Source: $src, Language: $lang, Url: $url"

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
