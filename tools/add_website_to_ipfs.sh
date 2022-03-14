#!/bin/bash

set -euo pipefail

# This script adds website that was created at <unpacked zim dir>
#  from <zim file name> to ipfs

usage() {
	echo "USAGE:"
	echo "	$0 <zim file name> <unpacked zim dir> [<extra ipfs add flags>]";
	echo ""
	exit 2
}

if [ -z "${1-}" ]; then
  echo "Missing main page name (eg. Main_Page.html) "
	usage
fi

if [ -z "${2-}" ]; then
  echo "Missing unpacked zim dir (eg. ./out) "
	usage
fi

ZIM_FILE=$1
TMP_DIRECTORY=$2
EXTRA_FLAGS=${3:-}

printf "\nAdding the processed tmp directory to IPFS\n(this part may take long time on a slow disk):\n"
CID=$(ipfs add -r --cid-version 1 --pin=false --offline -Q $EXTRA_FLAGS $TMP_DIRECTORY)
MFS_DIR="/${ZIM_FILE}__$(date +%F_%T)"

# pin by adding to MFS under a meaningful name
ipfs files cp /ipfs/$CID "$MFS_DIR"

printf "\n\n-------------------------\nD O N E !\n-------------------------\n"
printf "MFS: $MFS_DIR\n"
printf "CID: $CID"
printf "\n-------------------------\n"
