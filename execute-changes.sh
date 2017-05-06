#!/bin/bash
set -euo pipefail
IFS=$'\n\t'
ROOT="/root"

IPNS_HASH="QmQP99yW82xNKPxXLroxj1rMYMGF6Grwjj2o4svsdmGh7S"
SNAP_DATE="2017-04"


ipfs files rm "$ROOT/-/j/body.js" 
ipfs files cp /ipfs/$(sed -e 's/{{SNAPSHOT_DATE}}/'"$SNAP_DATE"'/' -e 's/{{IPNS_HASH}}/'"$IPNS_HASH"'/' \
	scripts/body.js | ipfs add -Q) "$ROOT/-/j/body.js" 
ipfs files rm "$ROOT/I/s/Wikipedia-logo-v2-200px-transparent.png"
ipfs files cp /ipfs/$(ipfs add -Q assets/wikipedia-on-ipfs-small-flat-cropped-offset-min.png) "$ROOT/I/s/Wikipedia-logo-v2-200px-transparent.png"
ipfs files rm "$ROOT/I/s/wikipedia-on-ipfs.png"
ipfs files cp /ipfs/$(ipfs add -Q assets/wikipedia-on-ipfs.png) "$ROOT/I/s/wikipedia-on-ipfs.png"

ipfs files stat "$ROOT"

