#!/bin/bash

set -euo pipefail

sudo sysctl -w net.core.rmem_max=2500000
ulimit -n 65536

pushd /tmp

# Put tools on path
sudo cp tools/start_ipfs.sh /usr/local/bin/start_ipfs.sh
sudo cp tools/add_website_to_ipfs.sh /usr/local/bin/add_website_to_ipfs.sh
sudo cp tools/publish_website_from_s3.sh /usr/local/bin/publish_website_from_s3.sh

# Install jq
wget https://github.com/stedolan/jq/releases/download/jq-1.6/jq-linux64
sudo cp jq-linux64 /usr/local/bin/jq
sudo chmod 755 /usr/local/bin/jq

# Install ipfs
wget https://dist.ipfs.io/go-ipfs/v0.12.0/go-ipfs_v0.12.0_linux-amd64.tar.gz
tar -xvzf go-ipfs_v0.12.0_linux-amd64.tar.gz
sudo go-ipfs/install.sh

# Install unzip
sudo apt install -y unzip

# Install awscli
wget https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip
unzip awscli-exe-linux-x86_64.zip
sudo aws/install

# Create ipfs service
echo "
[Unit]
Description=IPFS daemon service.

[Service]
Type=simple
User=ubuntu
ExecStart=start_ipfs.sh

[Install]
WantedBy=multi-user.target
" | sudo tee /etc/systemd/system/ipfs.service
sudo chmod 644 /etc/systemd/system/ipfs.service
sudo systemctl daemon-reload
sudo systemctl enable ipfs

popd
