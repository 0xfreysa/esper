#!/bin/bash

sudo yum group install -y "Development Tools"

sudo amazon-linux-extras enable aws-nitro-enclaves-cli
sudo yum clean metadata && sudo yum makecache
# Pin version for reproducable .EIF files
sudo yum install -y aws-nitro-enclaves-cli-devel-1.3.4

sudo yum install -y socat
sudo yum install -y make
sudo yum install -y golang

sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

sudo yum install -y aws-nitro-enclaves-cli
sudo systemctl enable nitro-enclaves-allocator.service
sudo systemctl start nitro-enclaves-allocator.service

git clone git://git.musl-libc.org/musl 
cd musl && ./configure --prefix=/usr/local && make && sudo make install && cd ..
rm -rf musl

mkdir -p bin
sudo mkdir -p /var/log/nitro_enclaves
sudo chown root:ne /var/log/nitro_enclaves
sudo chmod 775 /var/log/nitro_enclaves
sudo usermod -aG ne $USER

sudo yum install -y openssl-devel pkgconfig

sudo yum install -y protobuf protobuf-compiler protobuf-devel