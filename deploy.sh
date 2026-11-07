#!/usr/bin/env sh
# Deploys every folder under sites/ to its own surge subdomain.
set -eu
cd "$(dirname "$0")"
PREFIX="jg-quick"
for dir in sites/*/; do
  name=$(basename "$dir")
  timeout 180 pnpx surge "$dir" "$PREFIX-$name.surge.sh"
  timeout 10 cmd //c start "" "https://$PREFIX-$name.surge.sh/"
done
