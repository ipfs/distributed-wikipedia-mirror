#!/bin/bash
# vim: set ts=2 sw=2:

set -euo pipefail

# Landing pages shipping with ZIM file are either truncated or Kiwix-specific.
# This script finds the URL of original version of the langing page
# mathing the timestamp of snapshot in unpacked ZIM directory

usage() {
	echo "USAGE:"
	echo "	$0 <main page name> <unpacked zim dir>";
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

MAIN_PAGE=$1
ZIM_ROOT=$2

SNAPSHOT_URL=$(grep -io 'https://[^"]*oldid=[^"]*' "$ZIM_ROOT/A/$MAIN_PAGE")

echo $SNAPSHOT_URL
