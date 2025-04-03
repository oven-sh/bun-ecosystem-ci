#!/bin/bash

set -eo pipefail

. .buildkite/setup-bun.sh
echo "PATH:"
echo $PATH

bun install
bun src/index.ts
