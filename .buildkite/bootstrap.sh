#!/bin/bash

set -eo pipefail

curl -fsSL https://bun.sh/install | bash
echo "bun installation dir:"
ls -la ~/.bun

echo "bashrc:"
cat ~/.bashrc
. ~/.bashrc
echo "PATH:"
echo $PATH

bun install
bun src/index.ts
