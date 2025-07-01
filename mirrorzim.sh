#!/bin/bash
# vim: set ts=2 sw=2:

set -euo pipefail

# Download a zim file, unpack it, convert to website then push to local ipfs instance

usage() {
	echo "USAGE:"
	echo " $0 - download a zim file, unpack it, convert to website then add to MFS at local IPFS instance"
	echo ""
	echo "SYNOPSIS"
	echo " $0 --languagecode=<LANGUAGE_CODE> --wikitype=<WIKI_TYPE>"
	echo "    [--hostingdnsdomain=<HOSTING_DNS_DOMAIN>]"
	echo "    [--hostingipnshash=<HOSTING_IPNS_HASH>]"
	echo "    [--mainpageversion=<MAIN_PAGE_VERSION>]"
	echo ""
	echo "OPTIONS"
	echo ""
	echo "  -l, --languagecode       string - the language of the wikimedia property e.g. tr - turkish, en - english"
	echo "  -w, --wikitype           string - the type of the wikimedia property e.g. wikipedia, wikiquote"
	echo "  -d, --hostingdnsdomain   string - the DNS domain name the mirror will be hosted at e.g. tr.wikipedia-on-ipfs.org"
	echo "  -i, --hostingipnshash    string - the IPNS hash the mirror will be hosted at e.g. QmVH1VzGBydSfmNG7rmdDjAeBZ71UVeEahVbNpFQtwZK8W"
	echo "  -v, --mainpageversion    string - an override hack used on Turkish Wikipedia, it sets the main page version as there are issues with the Kiwix version id"

	exit 2
}


for i in "$@"
do
case $i in
    -l=*|--languagecode=*)
    LANGUAGE_CODE="${i#*=}"
    shift
    ;;
    -w=*|--wikitype=*)
    WIKI_TYPE="${i#*=}"
    shift
    ;;
    -d=*|--hostingdnsdomain=*)
    HOSTING_DNS_DOMAIN="${i#*=}"
    shift
    ;;
	-i=*|--hostingipnshash=*)
    HOSTING_IPNS_HASH="${i#*=}"
    shift
    ;;
	-v=*|--mainpageversion=*)
    MAIN_PAGE_VERSION="${i#*=}"
    shift
    ;;
    --default)
    DEFAULT=YES
    shift
    ;;
    *)
          # unknown option
    ;;
esac
done

if [ -z ${LANGUAGE_CODE+x} ]; then
	echo "Missing wiki language code e.g. tr - turkish, en - english"
	usage
fi

if [ -z ${WIKI_TYPE+x} ]; then
	echo "Missing wiki type e.g. wikipedia, wikiquote"
	usage
fi

if [ -z ${HOSTING_DNS_DOMAIN+x} ]; then
	HOSTING_DNS_DOMAIN=""
fi

if [ -z ${HOSTING_IPNS_HASH+x} ]; then
	HOSTING_IPNS_HASH=""
fi

if [ -z ${MAIN_PAGE_VERSION+x} ]; then
	MAIN_PAGE_VERSION=""
fi

printf "\nEnsure zimdump is present...\n"
PATH=$PATH:$(realpath ./bin)
which zimdump &> /dev/null || (curl --progress-bar -L https://download.openzim.org/release/zim-tools/zim-tools_linux-x86_64-3.4.0-2.tar.gz | tar -xvz --strip-components=1 -C ./bin zim-tools_linux-x86_64-3.4.0-2/zimdump && chmod +x ./bin/zimdump)

printf "\nDownload and verify the zim file...\n"
ZIM_FILE_SOURCE_URL="$(./tools/getzim.sh download $WIKI_TYPE $WIKI_TYPE $LANGUAGE_CODE all maxi latest | grep 'URL:' | cut -d' ' -f3)"
ZIM_FILE=$(echo $ZIM_FILE_SOURCE_URL | rev | cut -d'/' -f1 | rev)
TMP_DIRECTORY="./tmp/$(echo $ZIM_FILE | cut -d'.' -f1)"

# Note: successful zimdump ends with creation of $TMP_DIRECTORY/zimdump_version
# We use it as a hint  if tmpdir  should be purged or not

printf "\nRemove any partial tmp directory $TMP_DIRECTORY before run ..."
# so.. turns out rsync is the fastest: https://www.slashroot.in/which-is-the-fastest-method-to-delete-files-in-linux
test -e $TMP_DIRECTORY/zimdump_version || (mkdir -p ./tmp/blank && rsync -a --delete ./tmp/blank/ $TMP_DIRECTORY ; rm -rf $TMP_DIRECTORY ./tmp/blank)

printf "\nUnpack the zim file into $TMP_DIRECTORY if not there already...\n"
test -e $TMP_DIRECTORY/zimdump_version || (zimdump dump ./snapshots/$ZIM_FILE --dir $TMP_DIRECTORY && zimdump --version > $TMP_DIRECTORY/zimdump_version)

# Find the main page of ZIM
ZIM_FILE_MAIN_PAGE=$(zimdump info ./snapshots/$ZIM_FILE | grep -oP 'main page: A/\K\S+')

# Resolve the main page as it is on wikipedia over http
MAIN_PAGE=$(./tools/find_main_page_name.sh "$LANGUAGE_CODE.$WIKI_TYPE.org")

printf "\nConvert the unpacked zim directory to a website\n"
node ./bin/run $TMP_DIRECTORY \
  --zimfile=./snapshots/$ZIM_FILE \
  --kiwixmainpage=$ZIM_FILE_MAIN_PAGE \
  --mainpage=$MAIN_PAGE \
  ${HOSTING_DNS_DOMAIN:+--hostingdnsdomain=$HOSTING_DNS_DOMAIN} \
  ${HOSTING_IPNS_HASH:+--hostingipnshash=$HOSTING_IPNS_HASH} \
  ${MAIN_PAGE_VERSION:+--mainpageversion=$MAIN_PAGE_VERSION}

printf "\n-------------------------\n"
printf "\nIPFS_PATH=$IPFS_PATH\n"

printf "\nAdding the processed tmp directory to IPFS\n(this part may take long time on a slow disk):\n"
CID=$(ipfs add -r --cid-version 1 --nocopy -Qp $TMP_DIRECTORY)
MFS_DIR="/${ZIM_FILE}__$(date +%F_%T)"

# pin by adding to MFS under a meaningful name
ipfs files cp /ipfs/$CID "$MFS_DIR"

printf "\n\n-------------------------\nD O N E !\n-------------------------\n"
printf "MFS: $MFS_DIR\n"
printf "CID: $CID"
printf "\n-------------------------\n"
