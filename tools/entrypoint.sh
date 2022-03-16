#!/bin/bash

set -eu

ipfs init -p server,flatfs --empty-repo
ipfs config --json Experimental.AcceleratedDHTClient true
ipfs config --json 'Datastore.Spec.mounts' "$(ipfs config 'Datastore.Spec.mounts' | jq -c '.[0].child.sync=false')"

./mirrorzim.sh "$@" | ts

ipfs daemon
