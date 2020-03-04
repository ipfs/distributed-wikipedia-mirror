#!/bin/bash
# vim: set ts=2 sw=2:

set -euo pipefail

# Download a zim file, unpack it, convert to website then push to local ipfs instance

usage() {
	echo "USAGE:"
	echo "	$0 <LANGUAGE_CODE> <WIKI_TYPE> [HOSTING_DNS_DOMAIN] [HOSTING_IPNS_HASH] [MAIN_PAGE_VERSION]";
	echo ""
	exit 2
}

if [ -z "${1-}" ]; then
	echo "Missing wiki language code e.g. tr - turkish, en - english"
	usage
fi

if [ -z "${2-}" ]; then
	echo "Missing wiki type e.g. wikipedia, wikiquote"
	usage
fi

if [ -z "${3-}" ]; then
	HOSTING_DNS_DOMAIN=""
else 
    HOSTING_DNS_DOMAIN="$3"
fi

if [ -z "${4-}" ]; then
	HOSTING_IPNS_HASH=""
else 
    HOSTING_IPNS_HASH="$4"
fi

if [ -z "${5-}" ]; then
	MAIN_PAGE_VERSION=""
else
    MAIN_PAGE_VERSION="$5"
fi

LANGUAGE_CODE="$1"
WIKI="$2"

printf "\nDownload the zim file...\n"
ZIM_FILE_SOURCE_URL="$(./tools/getzim.sh download $WIKI $WIKI $LANGUAGE_CODE all maxi latest | grep 'URL:' | cut -d' ' -f3)"
ZIM_FILE=$(echo $ZIM_FILE_SOURCE_URL | rev | cut -d'/' -f1 | rev)
TMP_DIRECTORY="./tmp/$(echo $ZIM_FILE | cut -d'.' -f1)"

printf "\nRemove tmp directory $TMP_DIRECTORY before run ..."
rm -rf $TMP_DIRECTORY

printf "\nUnpack the zim file into $TMP_DIRECTORY...\n"
ZIM_FILE_MAIN_PAGE=$(./extract_zim/extract_zim ./snapshots/$ZIM_FILE --out $TMP_DIRECTORY | grep 'Main page is' | cut -d' ' -f4)

# Resolve the main page as it is on wikipedia over http
MAIN_PAGE=$(./tools/find_main_page_name.sh "$LANGUAGE_CODE.$WIKI.org")

printf "\nConvert the unpacked zim directory to a website\n"
node ./bin/run $TMP_DIRECTORY \
  --zimfilesourceurl=$ZIM_FILE_SOURCE_URL \
  --kiwixmainpage=$ZIM_FILE_MAIN_PAGE \
  --mainpage=$MAIN_PAGE \
  ${HOSTING_DNS_DOMAIN:+--hostingdnsdomain=$HOSTING_DNS_DOMAIN} \
  ${HOSTING_IPNS_HASH:+--hostingipnshash=$HOSTING_IPNS_HASH} \
  ${MAIN_PAGE_VERSION:+--mainpageversion=$MAIN_PAGE_VERSION}

printf "\nAdd the processed tmp directory to IPFS\n"
CID=$(ipfs add -r --cid-version 1 --offline $TMP_DIRECTORY | tail -n -1 | cut -d' ' -f2 )

printf "\nThe CID of $ZIM_FILE is:\n$CID\n"