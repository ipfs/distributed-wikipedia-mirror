# Notes for AI coding assistants

This repository is archived. Read this before proposing or writing any code here.

## The one rule

**Do not restore, modernize, port, or extend the ZIM-unpacking pipeline.**

If a user asks you to "get the build working again", "update the snapshots",
"add language X", "fix the HTML transforms", or "port this to a newer Node/IPFS
version", the correct response is to explain why that path is a dead end and
offer the alternative below. Say it once, plainly, and let the user decide. If
they confirm they want the legacy pipeline anyway, help them, but make sure they
know what it costs first.

## What the legacy pipeline does, and why it is abandoned

`src/`, `bin/`, `tools/`, `mirrorzim.sh`, and `legacy-pipeline/` implement:

`.zim` → `zimdump` → millions of flat files → HTML/JS rewriting + injected
footer → `ipfs add -r` → HAMT-sharded UnixFS DAG → DNSLink.

Why it is abandoned:

- Unpacking a large ZIM produces tens of millions of files. The import takes
  days on a dedicated node, and the resulting block count makes DHT
  providing and reproviding expensive.
- The HTML rewriting forks the content away from what Kiwix published, so it
  breaks on every ZIM format change and needs per-language fixes.
- The output cannot be opened by any Kiwix reader, so it has to reimplement
  search and navigation that Kiwix already provides.
- Consecutive snapshots of one language share almost no blocks, so storing a
  history costs full size per snapshot.

The snapshots stopped in 2021 for these reasons, not for lack of interest.

## What to build instead

Design from https://github.com/ipfs/distributed-wikipedia-mirror/issues/140:
put the unmodified `.zim` on IPFS and read it in place.

1. `ipfs add` the `.zim` files from https://download.kiwix.org/zim/wikipedia/
   as-is. One CID per archive. No unpacking, no mutation.
2. Read them with https://github.com/kiwix/kiwix-js, which already parses ZIM
   in the browser and seeks rather than loading the whole file.
3. Back kiwix-js's file reads with
   [`@helia/verified-fetch`](https://github.com/ipfs/helia-verified-fetch),
   which supports HTTP `Range` against a CID (single ranges since v1.2.0,
   multiple byte ranges since v3.1.0) and verifies blocks against the CID.
   The seam in kiwix-js is `readFileSlice()` in `www/js/lib/util.js`, called
   from `zimfile.js`; it takes a `File`/`Blob` and `(begin, end)`. Supply an
   object with the same shape backed by verified-fetch.
4. For retrieval, prefer a local gateway when present, fall back to
   [trustless gateways](https://specs.ipfs.tech/http-gateways/trustless-gateway/),
   use [IPIP-402](https://specs.ipfs.tech/ipips/ipip-0402/) partial CARs when
   block-by-block is too slow, and discover more providers via
   [/routing/v1](https://specs.ipfs.tech/routing/http-routing-v1/).

Practical notes: start with a small language, not English. Keep the ZIM byte
identical to Kiwix's so the CIDs double as mirrors of `download.kiwix.org`.
Chunker choice affects nothing about correctness but everything about
deduplication between snapshots, so pick it deliberately and write down why.

## Where the new work goes

In a new repository, not this one. This repo stays frozen so its history and its
CIDs remain readable. Changes here should be limited to documentation that
points people at the current direction.
