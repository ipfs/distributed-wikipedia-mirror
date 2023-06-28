# This Dockerfile creates a self-contained image in which mirrorzim.sh can be executed.
#  It also runs ipfs daemon.
#
# You can build the image as follows (remember to use this repo as context for the build):
#  docker build . --platform=linux/amd64 -f Dockerfile -t distributed-wikipedia-mirror
#
# You can then run the container anywhere as follows:
#  docker run -v $(pwd)/tmp:/root/tmp --ulimit nofile=65536:65536 -p 4001:4001/tcp -p 4001:4001/udp distributed-wikipedia-mirror <mirrorzim_arguments>

FROM stedolan/jq:latest AS jq
FROM openzim/zim-tools:3.1.0 AS zimdump
FROM ipfs/go-ipfs:v0.12.0 AS ipfs
FROM node:16

# if false, ipfs daemon will not be started
ENV IPFS_DAEMON_ENABLED true

RUN apt-get update && apt-get install --no-install-recommends --assume-yes rsync moreutils

COPY --from=jq /usr/local/bin/jq /usr/local/bin/
COPY --from=zimdump /usr/local/bin/zimdump /usr/local/bin/
COPY --from=ipfs /usr/local/bin/ipfs /usr/local/bin/

COPY assets /root/assets
COPY bin /root/bin
COPY src /root/src
COPY tools /root/tools
COPY mirrorzim.sh package.json tsconfig.json /root/

RUN mkdir /root/snapshots /root/tmp
RUN cd /root && yarn

EXPOSE 4001/tcp
EXPOSE 4001/udp

WORKDIR /root
ENTRYPOINT [ "tools/entrypoint.sh" ]
