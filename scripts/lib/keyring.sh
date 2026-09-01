#!/usr/bin/env bash
# scripts/lib/keyring.sh
#
# Local token obfuscator. Not a cryptographic boundary.
#
#   ./scripts/lib/keyring.sh encode <plaintext>   # → prints obfuscated blob
#   ./scripts/lib/keyring.sh decode <blob>        # → prints plaintext

set -euo pipefail

readonly _S="${KR_S:-cestine}"

_k() {
  printf '%s%s' "$_S" "$1" | openssl dgst -sha256 -hex 2>/dev/null | awk '{print $NF}'
}

_enc() {
  local ts iv k c
  ts=$(date +%s)
  iv=$(openssl rand -hex 16)
  k=$(_k "$ts")
  c=$(printf '%s' "$1" | openssl enc -aes-256-cbc -K "$k" -iv "$iv" -a -A 2>/dev/null)
  printf '%s.%s.%s\n' "$ts" "$iv" "$c"
}

_dec() {
  local ts iv c k
  IFS='.' read -r ts iv c <<< "$1"
  k=$(_k "$ts")
  printf '%s' "$c" | openssl enc -aes-256-cbc -d -K "$k" -iv "$iv" -a -A 2>/dev/null
}

case "${1:-}" in
  encode|enc|e) _enc "${2:?value required}" ;;
  decode|dec|d) _dec "${2:?value required}" ;;
  *)
    echo "usage: $0 {encode|decode} <value>" >&2
    exit 2
    ;;
esac
