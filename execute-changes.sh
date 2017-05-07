#!/bin/bash
set -euo pipefail
IFS=$'\n\t'
ROOT="/root"

IPNS_HASH="QmQP99yW82xNKPxXLroxj1rMYMGF6Grwjj2o4svsdmGh7S"
SNAP_DATE="2017-04"

ipfs-replace() {
  ipfs files rm "$ROOT/$2" || true
  ipfs files cp "$1" "$ROOT/$2"
}

ipfs files rm "$ROOT/-/j/body.js" 
ipfs files cp /ipfs/$(sed -e 's/{{SNAPSHOT_DATE}}/'"$SNAP_DATE"'/g' -e 's/{{IPNS_HASH}}/'"$IPNS_HASH"'/g' \
	scripts/body.js | ipfs add -Q) "$ROOT/-/j/body.js" 
ipfs files rm "$ROOT/I/s/Wikipedia-logo-v2-200px-transparent.png"
ipfs files cp /ipfs/$(ipfs add -Q assets/wikipedia-on-ipfs-small-flat-cropped-offset-min.png) "$ROOT/I/s/Wikipedia-logo-v2-200px-transparent.png"
ipfs files rm "$ROOT/I/s/wikipedia-on-ipfs.png" || true
ipfs files cp /ipfs/$(ipfs add -Q assets/wikipedia-on-ipfs-100px.png) "$ROOT/I/s/wikipedia-on-ipfs.png"

ipfs files rm "$ROOT/-/j/search.js" || true
ipfs files cp /ipfs/$(ipfs add -Q scripts/search.js) "$ROOT/-/j/search.js"



# comment out some debug stuff in head.js
HEAD_JS_LOCATION="$(ipfs files stat --hash "$ROOT")/-/j/head.js"
HEAD_JS_HASH="$(ipfs cat "$HEAD_JS_LOCATION" | sed -e "s|^\tdocument.getElementsByTagName( 'head' )|//\0|" | ipfs add -Q)"

ipfs files rm "$ROOT/-/j/head.js"
ipfs files cp "/ipfs/$HEAD_JS_HASH" "$ROOT/-/j/head.js"

ipfs-replace /ipfs/$(ipfs add -Q redirect-page/index.html) "/wiki/index.html"

ipfs files stat "$ROOT"

