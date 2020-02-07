#!/bin/bash
# vim: set ts=2 sw=2:

set -euo pipefail
IFS=$'\n\t'

error() {
	echo "$@"
	exit 1
}

usage() {
	echo "USAGE:"
	echo "	$0 [-h|--help] [--ipns=<ipns hash>] [--date=<date of snapshot>]";
	echo "		[--search=<cid of searchset>] [--main=<article>] <ipfs files root>"
	echo ""
	echo "  -h|--help		- displays help"
	echo "  --ipns			- ipns hash of the archive"
	echo "  --date			- date of snapshot (defaults to this month)"
	echo "  --search		- hash of search IPLD structure"
	echo "  --main 			- full name of article containing intro page (e.g. Main_Page.html)"
	exit 2
}

if [ "$(getopt --test >/dev/null 2>&1; echo $?)" -ne "4" ]; then
	error "getopt enchanced required, 'getopt --test' should have exit code 4"
fi


LONG_OPT="help,search:,ipns:,date:,main:"
SHORT_OPT="h"
PARSED_OPTS=$(getopt -n "$0" -o "$SHORT_OPT" -l "$LONG_OPT" -- "$@") || usage

eval set -- "$PARSED_OPTS"

# defaults
SNAP_DATE=$(date +"%Y-%m-%d")
IPNS_HASH=""
SEARCH=""
MAIN=index.htm

while true; do
	case "$1" in
		-h|--help)
			usage;;
		--date)
			SNAP_DATE="$2"
			shift 2;;
		--ipns)
			IPNS_HASH="$2"
			shift 2;;
		--search)
			SEARCH="$2"
			shift 2;;
		--main)
			MAIN="$2"
			shift 2;;
		--)
			shift;
			break;;
	esac
done

if [ -z "${1-}" ]; then
	echo "Missing ipfs files root"
	usage
fi
ROOT="$1"

ipfs-replace() {
	ipfs files rm "$ROOT/$1" >/dev/null 2>&1 || true
	ipfs files --flush=false cp "$2" "$ROOT/$1"
}

if ipfs files stat "$ROOT/A" >/dev/null 2>&1; then
	ipfs files mv "$ROOT/A" "$ROOT/wiki"
fi

NEW_BODYJS=$(
	sed -e 's/{{SNAPSHOT_DATE}}/'"$SNAP_DATE"'/g' \
	-e 's/{{IPNS_HASH}}/'"$IPNS_HASH"'/g' scripts/body.js |\
	if [ -n "$SEARCH" ]; then
		cat - <(sed -e 's/{{SEARCH_CID}}/'"$SEARCH"'/' scripts/search-shim.js)
	else
		cat -
	fi | ipfs add --cid-version 1 -Q
)

ipfs-replace "-/j/body.js" "/ipfs/$NEW_BODYJS"
ipfs-replace "I/s/Wikipedia-logo-v2-200px-transparent.png" \
	"/ipfs/$(ipfs add --cid-version 1 -q assets/wikipedia-on-ipfs-small-flat-cropped-offset-min.png)"
ipfs-replace "I/s/wikipedia-on-ipfs.png" \
	"/ipfs/$(ipfs add --cid-version 1 -Q assets/wikipedia-on-ipfs-100px.png)"

if [ -n "$SEARCH" ]; then
	ipfs-replace "-/j/search.js" "/ipfs/$(ipfs add --cid-version 1 -Q scripts/search.js)"
fi

# comment out some debug stuff in head.js
HEAD_JS_LOCATION="$(ipfs files stat --hash "$ROOT")/-/j/head.js"
HEAD_JS_HASH="$(ipfs cat "$HEAD_JS_LOCATION" | sed -e "s|^\tdocument.getElementsByTagName( 'head' )|//\0|" | ipfs add --cid-version 1 -Q)"

ipfs-replace "-/j/head.js" "/ipfs/$HEAD_JS_HASH"

ipfs-replace "/wiki/index.html" "$ROOT/wiki/$MAIN"
ipfs-replace "/index.html" "/ipfs/$(ipfs add --cid-version 1 -Q redirect-page/index_root.html)"

ipfs files flush "$ROOT"
echo "We are done !!!"
ipfs files stat "$ROOT"


