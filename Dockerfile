FROM ubuntu:18.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update
RUN apt-get -y install --no-install-recommends git ca-certificates make build-essential curl wget apt-utils golang-go

RUN curl -sL https://deb.nodesource.com/setup_14.x -o nodesource_setup.sh \
    && bash nodesource_setup.sh \
    && apt-get -y install --no-install-recommends nodejs \
    && npm install -g yarn http-server

RUN wget -nv https://dist.ipfs.io/go-ipfs/v0.7.0/go-ipfs_v0.7.0_linux-amd64.tar.gz \
    && tar xvfz go-ipfs_v0.7.0_linux-amd64.tar.gz \
    && mv go-ipfs/ipfs /usr/local/bin/ipfs \
    && rm -r go-ipfs && rm go-ipfs_v0.7.0_linux-amd64.tar.gz \
    && ipfs init --profile badgerds --empty-repo \
    && ipfs config --json 'Experimental.ShardingEnabled' true

# #
# # Clean up
# && apt-get autoremove -y \
# && apt-get clean -y \
# && rm -rf /var/lib/apt/lists/*

ENV DEBIAN_FRONTEND=dialog

RUN mkdir /root/distributed-wikipedia-mirror
VOLUME ["/root/distributed-wikipedia-mirror"]
WORKDIR /root/distributed-wikipedia-mirror
