# distributed-wikipedia
Putting Wikipedia on IPFS

## How to add new Wikipedia snapshots to IPFS

If you would like to create an updated Wikipedia snapshot on IPFS, you can follow these steps.

### Step 1: Download the latest snapshot from kiwix.org
Download the latest snapshot of Wikipedia (in ZIM format) from http://wiki.kiwix.org/wiki/Content_in_all_languages

### Step 2: Unpack the ZIM snapshot
Unpack the ZIM snapshot using https://github.com/dignifiedquire/zim/commit/a283151105ab4c1905d7f5cb56fb8eb2a854ad67

### Step 3: Enable Directory Sharding on your IPFS Node
Configure your IPFS node to enable directory sharding 
```sh
$ ipfs config --json 'Experimental.ShardingEnabled' true`
```

### Step 4: Add the data to IPFS
Add all the data the node using `ipfs add`. Use the following command, replacing `$unpacked_wiki` with the path to the unpacked ZIM snapshot that you created in Step 2.

```sh
$ ipfs add -w -r --raw-leaves $upacked_wiki`
```

Save the last hash of the output from that process. It is the hash of your new Wikipedia snapshot.

### Step 5: Share the hash
Share the hash of your new snapshot so people can access it and replicate it onto their machines.
