#!/bin/bash

set -eo pipefail

curl -fsSL https://bun.sh/install | bash
echo "bun installation dir:"
ls -la ~/.bun

export PATH="$HOME/.bun/bin:$PATH"
echo "PATH:"
echo $PATH

bun install
bun src/index.ts
