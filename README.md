# distributed-wikipedia
Putting wikipedia on IPFS

## How to add new Wikipedia snapshots to IPFS

If you would like to create an updated Wikipedia snapshot on IPFS, you can follow these steps.

1. Download the latest snapshot of Wikipedia (in ZIM format) from http://wiki.kiwix.org/wiki/Content_in_all_languages
2. Unpack the ZIM snapshot using https://github.com/dignifiedquire/zim/commit/a283151105ab4c1905d7f5cb56fb8eb2a854ad67
3. Configure your IPFS node to enable directory sharding - run `ipfs config --json 'Experimental.ShardingEnabled' true`
3. Add all the data the node using `ipfs add -w -r --raw-leaves $upacked_wiki`.
4. Save the last hash of that output. It is the hash of your new Wikipedia snapshot
