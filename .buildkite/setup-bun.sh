#!/bin/bash

# @script setup-bun.sh
# @description Download Bun via internal CDN. Avoids recording downloads in public download metrics.

set -e

bun_version="latest"
download_url="https://pub-5e11e972747a44bf9aaf9394f185a982.r2.dev/releases"
tmpdir=$(mktemp -d)

if [[ $BUN_VERSION ]]; then
    bun_version=$BUN_VERSION
fi

case "$(uname -s)" in
    Linux*)  os=linux;;
    Darwin*) os=darwin;;
    *)       os=windows;;
esac
case "$(uname -m)" in
    arm64 | aarch64)  arch=aarch64;;
    *)                arch=x64;;
esac

case "${bun_version}" in
    latest) release="latest";;
    canary) release="canary";;
    *)      release="bun-v${bun_version}";;
esac

target="bun-${os}-${arch}"
pushd $tmpdir
echo "Downloading ${target}..."
curl -LO "${download_url}/${release}/${target}.zip" --retry 5
unzip ${target}.zip
mkdir -p ~/.bun/bin
mv ${target}/bun* ~/.bun/bin/
chmod +x ~/.bun/bin/*
ln -fs ~/.bun/bin/bun ~/.bun/bin/bunx
popd

echo '' >> ~/.bashrc
echo "export PATH=\"${tmpdir}/.bun/bin:\$PATH\"" >> ~/.bashrc
export PATH="$HOME/.bun/bin:$PATH"
