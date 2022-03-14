# This Dockerfile creates a self-contained image in which mirrorzim.sh can be executed
#
# You can build the image as follows (remember to use this repo as context for the build):
#  docker build . -f Dockerfile -t distributed-wikipedia-mirror
#
# You can then run the container anywhere as follows
#  docker run --rm -v $(pwd)/snapshots:/github/workspace/snapshots -v $(pwd)/tmp:/github/workspace/tmp distributed-wikipedia-mirror <mirrorzim.sh arguments>
#  NOTE(s):
#   - volume attached at /github/workspace/snapshots will contain downloaded zim files after the run
#   - volume attached at /github/workspace/tmp will contain created website directories after the run

FROM openzim/zim-tools:3.1.0 AS openzim

FROM node:16.14.0-buster-slim

RUN apt update && apt upgrade && apt install -y curl wget rsync

COPY --from=openzim /usr/local/bin/zimdump /usr/local/bin

COPY tools/docker_entrypoint.sh /usr/local/bin

RUN mkdir -p /github/distributed-wikipedia-mirror
RUN mkdir -p /github/distributed-wikipedia-mirror/snapshots
RUN mkdir -p /github/distributed-wikipedia-mirror/tmp
RUN mkdir -p /github/workspace

COPY . /github/distributed-wikipedia-mirror

RUN cd /github/distributed-wikipedia-mirror && yarn

VOLUME [ "/github/workspace" ]

WORKDIR /github/distributed-wikipedia-mirror
ENTRYPOINT [ "docker_entrypoint.sh" ]
