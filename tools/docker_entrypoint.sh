#!/bin/bash

set -euo pipefail

pushd /github/distributed-wikipedia-mirror
./mirrorzim.sh "$@" "--push=false"
mkdir -p /github/workspace/snapshots
mkdir -p /github/workspace/tmp
mv snapshots/* /github/workspace/snapshots
mv tmp/* /github/workspace/tmp
popd
