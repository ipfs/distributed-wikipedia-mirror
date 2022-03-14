#!/bin/bash

set -euo pipefail

usage() {
	echo "USAGE:"
	echo "	$0 <website name>";
	echo ""
	exit 2
}

if [ -z "${1-}" ]; then
  echo "Missing website name (eg. wikipedia_be_all_maxi_2022-03) "
	usage
fi

WEBSITE_NAME=$1

wget "https://wikipedia-on-ipfs.s3.eu-central-1.amazonaws.com/website-packages/${WEBSITE_NAME}.tar.gz"
tar -xzf "${WEBSITE_NAME}.tar.gz"
add_website_to_ipfs.sh "${WEBSITE_NAME}.zim" "${WEBSITE_NAME}"
