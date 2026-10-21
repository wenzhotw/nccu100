#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
result=$(mktemp ./v2-landing-save-results.XXXXXX)
trap 'rm -f "$result"' EXIT
node tests/landing-save-v2.mjs > "$result"
mv "$result" v2-landing-save-results.json
node --test tests/baozhong-tents.test.mjs tests/baozhong-decor-v2.test.mjs tests/baozhong-decor-ctx.test.mjs tests/baozhong-decor-loader.test.mjs tests/baozhong-flow.test.mjs tests/independent.test.mjs tests/gpt-common-repair.test.mjs tests/recovery-v2.test.mjs
