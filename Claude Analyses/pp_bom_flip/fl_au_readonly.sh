#!/bin/zsh
# usage: fl.sh METHOD PATH [JSON]  -> Fulfil LIVE AU key, READ ONLY (refuses anything that is not a read)
E=/Users/home/Documents/CLAUDE/horizon-demand-and-supply-planner/.env
case "$1 $2" in
  "GET "*|"PUT "*/search_read|"PUT "*/read|"PUT "*/search_count|"PUT "*/fields_get) ;;
  *) echo "REFUSING non-read on LIVE: $1 $2"; exit 1;;
esac
SUB=$(grep -E '^FULFIL_LIVE_SUBDOMAIN=' $E | cut -d= -f2- | tr -d '"'"'"' \r')
KEY=$(grep -E '^FULFIL_LIVE_AU_API_KEY=' $E | cut -d= -f2- | tr -d '"'"'"' \r')
B="https://$SUB.fulfil.io/api/v2"
if [ -n "$3" ]; then curl -s -X "$1" "$B$2" -H "X-API-KEY: $KEY" -H 'Content-Type: application/json' -d "$3"
else curl -s -X "$1" "$B$2" -H "X-API-KEY: $KEY"; fi
