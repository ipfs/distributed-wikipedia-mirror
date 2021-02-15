FROM debian:stable

ENV DEBIAN_FRONTEND=noninteractive

RUN apt update
RUN apt -y install --no-install-recommends git ca-certificates curl wget apt-utils

# install:
# - zimdump from zim-tools_linux-x86_64-2021-02-12 (2.2.0 nightly)
# - node and yarn
# - go-ipfs
RUN curl - sL https://ipfs.io/ipfs/QmaXutNuSv9T7w62TzMMKUgtxs9g81GvMt1vKqduLn77Yj -o /usr/local/bin/zimdump \
    && chmod +x /usr/local/bin/zimdump \
    && curl -sL https://deb.nodesource.com/setup_14.x -o nodesource_setup.sh \
    && bash nodesource_setup.sh \
    && apt -y install --no-install-recommends nodejs \
    && npm install -g yarn \
    && wget -nv https://dist.ipfs.io/go-ipfs/v0.7.0/go-ipfs_v0.7.0_linux-amd64.tar.gz \
    && tar xvfz go-ipfs_v0.7.0_linux-amd64.tar.gz \
    && mv go-ipfs/ipfs /usr/local/bin/ipfs \
    && rm -r go-ipfs && rm go-ipfs_v0.7.0_linux-amd64.tar.gz \
    && ipfs init --profile badgerds --empty-repo \
    && ipfs config --json 'Experimental.ShardingEnabled' true

# TODO: move repo init after external volume is mounted

ENV DEBIAN_FRONTEND=dialog

RUN mkdir /root/distributed-wikipedia-mirror
VOLUME ["/root/distributed-wikipedia-mirror"]
WORKDIR /root/distributed-wikipedia-mirror
