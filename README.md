
<p align="center">
<img src="https://camo.githubusercontent.com/cb217efab8ea638d8169e4ec15b006f194ae6e02/68747470733a2f2f697066732e696f2f697066732f516d62344b4b615a79524b3168677837465575746977556641335a4d3269777a433651757144356a59454465426a2f77696b6970656469612d6f6e2d697066732e706e67" width="40%" />
</p>

<h1 align="center">Distributed Wikipedia Mirror Project</h1>
<p align="center">
Putting Wikipedia Snapshots on IPFS and working towards making it fully read-write.
<br />
<br />
 Existing Mirrors: https://en.wikipedia-on-ipfs.org, https://tr.wikipedia-on-ipfs.org
</p>

## Purpose

“We believe that information—knowledge—makes the world better. That when we ask questions, get the facts, and are able to understand all perspectives on an issue, it allows us to build the foundation for a more just and tolerant society” 
-- Katherine Maher, Executive Director of the Wikimedia Foundation

## Wikipedia on IPFS -- Background

### What does it mean to put Wikipedia on IPFS?

The idea of putting Wikipedia on IPFS has been around for a while. Every few months or so someone revives the threads. You can find such discussions in [this github issue about archiving wikipedia](https://github.com/ipfs/archives/issues/20), [this issue about possible integrations with Wikipedia](https://github.com/ipfs/notes/issues/46), and [this proposal for a new project](https://github.com/ipfs/notes/issues/47#issuecomment-140587530).

We have two consecutive goals regarding Wikipedia on IPFS: Our first goal is to create periodic read-only snapshots of Wikipedia.  A second goal will be to create a full-fledged read-write version of Wikipedia. This second goal would connect with the Wikimedia Foundation’s bigger, longer-running conversation about decentralizing Wikipedia, which you can read about at https://strategy.m.wikimedia.org/wiki/Proposal:Distributed_Wikipedia

### (Goal 1) Read-Only Wikipedia on IPFS

The easy way to get Wikipedia content on IPFS is to periodically -- say every week -- take snapshots of all the content and add it to IPFS. That way the majority of Wikipedia users -- who only read wikipedia and don’t edit -- could use all the information on wikipedia with all the benefits of IPFS. Users couldn't edit it, but users could download and archive swaths of articles, or even the whole thing. People could serve it to each other peer-to-peer, reducing the bandwidth load on Wikipedia servers. People could even distribute it to each other in closed, censored, or resource-constrained networks -- with IPFS, peers do not need to be connected to the original source of the content, being connected to anyone who has the content is enough. Effectively, the content can jump from computer to computer in a peer-to-peer way, and avoid having to connect to the content source or even the internet backbone. We've been in discussions with many groups about the potential of this kind of thing, and how it could help billions of people around the world to access information better -- either free of censorship, or circumventing serious bandwidth or latency constraints.

So far, we have achieved part of this goal: we have static snapshots of all of Wikipedia on IPFS. This is already a huge result that will help people access, keep, archive, cite, and distribute lots of content. In particular, we hope that this distribution helps people in Turkey, who find themselves in a tough situation. We are still working out a process to continue updating these snapshots, we hope to have someone at Wikimedia in the loop as they are the authoritative source of the content. **If you could help with this, please get in touch with us at wikipedia-project@ipfs.io.**

### (Goal 2) Fully Read-Write Wikipedia on IPFS

The long term goal is to get the full-fledged read-write Wikipedia to work on top of IPFS. This is much more difficult because for a read-write application like Wikipedia to leverage the distributed nature of IPFS, we need to change how the applications write data. A read-write wikipedia on IPFS would allow it to be completely decentralized, and create an extremely difficult to censor operation. In addition to all the benefits of the static version above, the users of a read-write Wikipedia on IPFS could write content from anywhere and publish it, even without being directly connected to any wikipedia.org servers. There would be automatic version control and version history archiving. We could allow people to view, edit, and publish in completely encrypted contexts, which is important to people in highly repressive regions of the world.

A full read-write version (2) would require a strong collaboration with Wikipedia.org itself, and finishing work on important dynamic content challenges -- we are working on all the technology (2) needs, but it's not ready for prime-time yet. We will update when it is.

## How to add new Wikipedia snapshots to IPFS

If you would like to create an updated Wikipedia snapshot on IPFS, you can follow these steps.

**Note: This is a work in progress.**. We intend to make it easy for anyone to create their own wikipedia snapshots and add them to IPFS, but our first emphasis has been to get the initial snapshots onto the network. This means some of the steps aren't as easy as we want them to be. If you run into trouble, seek help through a github issue, commenting in the #ipfs channel in IRC, or by posting a thread on https://discuss.ipfs.io.

### Step 1: Download the latest snapshot from kiwix.org
Download the latest snapshot of Wikipedia (in ZIM format) from http://wiki.kiwix.org/wiki/Content_in_all_languages

### Step 2: Unpack the ZIM snapshot
Unpack the ZIM snapshot using https://github.com/dignifiedquire/zim/commit/a283151105ab4c1905d7f5cb56fb8eb2a854ad67

### Step 3: Enable Directory Sharding on your IPFS Node
Configure your IPFS node to enable directory sharding
```sh
$ ipfs config --json 'Experimental.ShardingEnabled' true
```

### Step 4: Add the data to IPFS
Add all the data to your node using `ipfs add`. Use the following command, replacing `$unpacked_wiki` with the path to the unpacked ZIM snapshot that you created in Step 2. **Don't share the hash yet.**

```sh
$ ipfs add -w -r --raw-leaves $upacked_wiki
```

Save the last hash of the output from that process. You will use that in the next step.

### Step 5: Add mirror info and search bar to the snapshot
**IMPORTANT: The snapshots must say who disseminated them.** This effort to mirror Wikipedia snapshots is not affiliated with the Wikimedia foundation and is not connected to the volunteers whose contributions are contained in the snapshots. _The snapshots must include information explaining that they were created and disseminated by independent parties, not by Wikipedia._

We have provided a script that adds the necessary information. It also adds a decentralized, serverless search utility to the page.

Clone the distributed-wikipedia-mirror git repository

```sh
$ git clone git@github.com:ipfs/distributed-wikipedia-mirror.git
```

then `cd` into that directory

```sh
$ cd distributed-wikipedia-mirror
```

Write a copy of the snapshot from IPFS to `/root` on your machine

```sh
$ ipfs files cp /ipfs/$YOUR_WIKI_HASH /root
```

_[We intend to make this part easier. See [the issue](https://github.com/ipfs/distributed-wikipedia-mirror/issues/21)]_ Within `execute-changes.sh` update `IPNS_HASH` and `SNAP_DATE`. `IPNS_HASH` value should be the IPNS hash for the language-verison of Wikipedia you're adding. `SNAP_DATE` should be today's date.

Now run the script. It will process the content you copied into `/root`

```sh
$ ./execute-changes.sh
```

This will apply the modifications to your snapshot, add the modified version of the snapshot to IPFS, and return the hash of your new, modified version. That is the hash you want to share.

### Step 6: Share the hash
Share the hash of your new snapshot so people can access it and replicate it onto their machines.

# How to Help

If you would like to contribute to this effort, look at the [issues](https://github.com/ipfs/distributed-wikipedia-mirror/issues) in this github repo. Especially check for [issues marked with the "wishlist" label](https://github.com/ipfs/distributed-wikipedia-mirror/labels/wishlist) and issues marked ["help wanted"](https://github.com/ipfs/distributed-wikipedia-mirror/labels/help%20wanted).
