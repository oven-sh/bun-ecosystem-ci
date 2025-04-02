#!/bin/bash

set -eo pipefail

curl -fsSL https://bun.sh/install | bash
echo "bashrc:"
cat ~/.bashrc
source ~/.bashrc
bun install
bun src/index.ts
