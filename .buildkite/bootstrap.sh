#!/bin/bash

set -euo pipefail

curl -fsSL https://bun.sh/install | bash
echo "bashrc:"
cat ~/.bashrc
source ~/.bashrc
bun install
bun src/index.ts
