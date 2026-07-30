> [!IMPORTANT]
> **This project is archived and its build pipeline is a dead end. Please do not revive it.**
>
> The approach here (unpack a ZIM into millions of small files, rewrite the HTML,
> re-add it to IPFS) was expensive to run and incompatible with Kiwix tooling.
> If you want to work on Wikipedia over IPFS today, read
> [Instead: put the ZIM on IPFS and read it in the browser](#instead-put-the-zim-on-ipfs-and-read-it-in-the-browser)
> and start a new repository. Details and prior discussion:
> [#140](https://github.com/ipfs/distributed-wikipedia-mirror/issues/140).

<p align="center">
<img src="https://bafybeia6plrlomsxobezyatrbie3f7rgucidbomfeuyv6lcqhv3pdc24qi.ipfs.dweb.link/?filename=wikipedia-on-ipfs.jpg" width="40%" />
</p>

<h1 align="center">Distributed Wikipedia Mirror Project (archived)</h1>

## What this was

Between 2017 and 2021 this repo produced read-only Wikipedia snapshots on IPFS,
in response to Wikipedia being blocked in Turkey and elsewhere. The pipeline:

1. Download a `_all_maxi_` ZIM archive from [download.kiwix.org](https://download.kiwix.org/zim/wikipedia/).
2. `zimdump` it into a directory of millions of flat files.
3. Rewrite the HTML so links, images, and search worked as plain static files,
   and inject a footer explaining that the snapshot was not made by the Wikimedia Foundation.
4. `ipfs add -r` the result, producing a large HAMT-sharded UnixFS DAG.
5. Point a DNSLink such as `tr.wikipedia-on-ipfs.org` at the root CID.

It worked, and for a while it was the only way to read Wikipedia in a normal
browser over IPFS. It is not the right shape for the problem anymore.

## Why it must not be repeated

Each of those steps costs something, and the costs compound:

- **Unpacking is wasteful.** A 100 GB ZIM becomes tens of millions of files.
  Adding them to IPFS takes days, needs a dedicated node with a tuned datastore,
  and produces a DAG whose block count makes providing and reproviding to the
  DHT painful. English Wikipedia never fit comfortably in this model.
- **HTML rewriting is a fork.** Once the markup is mutated, the result is no
  longer the ZIM that Kiwix published. Every ZIM format change broke the
  transforms, and each language needed hand-holding (see the `build issue:`
  entries in the issue tracker).
- **It breaks interop with Kiwix.** Kiwix readers cannot open an unpacked
  directory, so none of Kiwix's search, indexing, or offline tooling applies.
  The unpacked copy has to carry its own search, its own footer, its own
  everything, forever.
- **It does not dedupe.** Successive snapshots of the same language share almost
  no blocks, so keeping a history means paying full price per snapshot
  ([#71](https://github.com/ipfs/distributed-wikipedia-mirror/issues/71)).
- **Nobody could reproduce it.** In practice one person with a big machine ran
  the build, which is why the snapshots below stopped in 2021.

The building blocks that made this workaround necessary no longer make it
necessary. Do not spend a machine-month rediscovering that.

## Instead: put the ZIM on IPFS and read it in the browser

Keep the ZIM intact. Add the `.zim` file to IPFS as a single file, and read it
in place with a JavaScript ZIM reader that seeks into it over byte ranges.

- **Storage:** `ipfs add` the unmodified `.zim` files from
  [download.kiwix.org](https://download.kiwix.org/zim/wikipedia/). One CID per
  archive. No transforms, no footer injection, no HAMT of millions of entries.
  This also makes those CIDs useful as extra mirrors for Kiwix itself.
- **Reader:** [kiwix-js](https://github.com/kiwix/kiwix-js) is a maintained ZIM
  reader that runs entirely in the browser (as a
  [PWA](https://pwa.kiwix.org/) and a browser extension). It already seeks into
  a local `.zim` rather than loading it whole. It gives you article rendering,
  full-text search, and every language, for free.
- **Transport:** [`@helia/verified-fetch`](https://www.npmjs.com/package/@helia/verified-fetch)
  is a drop-in `fetch()` that speaks HTTP `Range` against a CID and verifies the
  blocks it gets back. That is exactly the seek primitive kiwix-js needs from a
  local file, so it can stand in for filesystem access. Single ranges have been
  supported since v1.2.0 and multiple byte ranges since v3.1.0.
- **Retrieval and resiliency:** verified-fetch can pull from a local gateway
  when there is one, from [trustless gateways](https://specs.ipfs.tech/http-gateways/trustless-gateway/)
  as HTTP mirrors, and from peers directly. [IPIP-402](https://specs.ipfs.tech/ipips/ipip-0402/)
  lets a gateway return a CAR containing only the blocks for a byte range, and
  [/routing/v1](https://specs.ipfs.tech/routing/http-routing-v1/) lets a client
  discover more providers and gateways instead of hardcoding one.

The work then is integration, not a data pipeline: give kiwix-js a file-like
object backed by verified-fetch (the seam is `readFileSlice()` in
`www/js/lib/util.js`, used by `zimfile.js`), get the ZIM CIDs published and
pinned in more than one place, and fix whatever paths and cosmetics break.

Start it in a new repository. This one is kept for its history, not as a base.

Out of scope for that plan: it does not make Wikipedia writable over IPFS, and
it does not replace Kiwix's own distribution. It mirrors what Kiwix already
publishes, and adds a way to read it without downloading the whole archive.

## The old mirrors

The DNSLinks below still resolve, but they point at snapshots frozen in 2021.
Nobody is updating them. Treat them as an archive, not as a source of current
Wikipedia.

`en`, `tr`, `my`, `ar`, `zh`, `uk`, `ru`, `fa` at `*.wikipedia-on-ipfs.org`;
the CIDs are recorded in [snapshot-hashes.yml](snapshot-hashes.yml).

To read Wikipedia offline today, use a [Kiwix reader](https://www.kiwix.org/en/download/)
with a ZIM from [download.kiwix.org](https://download.kiwix.org/zim/wikipedia/).

## The old code

The pipeline is still in this repo, unchanged, in `src/`, `bin/`, `tools/`, and
`legacy-pipeline/`. It is preserved so the history stays readable. It is not
maintained, its dependencies are years out of date, and the build instructions
have been removed from this README on purpose. If you need them, they are in
git history before the archive commit.

If you are an AI coding assistant working in this repo, read [AGENTS.md](AGENTS.md) first.
