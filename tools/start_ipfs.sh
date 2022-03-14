#!/bin/bash

set -euo pipefail

# This script starts ipfs daemon
# If ipfs was not initialised before, this script also initialises ipfs

if ! ipfs repo stat; then
  ipfs init -p server,local-discovery,flatfs,randomports --empty-repo
  ipfs config --json Experimental.AcceleratedDHTClient true
  ipfs config --json 'Datastore.Spec.mounts' "$(ipfs config 'Datastore.Spec.mounts' | jq -c '.[0].child.sync=false')"
  ipfs config Addresses.Swarm '["/ip4/0.0.0.0/tcp/4001","/ip6/::/tcp/4001"]' --json
fi

ipfs daemon
