#!/bin/bash
# vim: set ts=2 sw=2:

set -euo pipefail

# Every Wikipedia version uses different name of the main page

usage() {
	echo "USAGE:"
	echo "	$0 <lang code>";
	echo ""
	exit 2
}

if [ -z "${1-}" ]; then
	echo "Missing language code"
	usage
fi

MAIN_PAGE=$(curl -Ls -o /dev/null -w %{url_effective} https://${1}.wikipedia.org | cut -d"/" -f5)
printf "${MAIN_PAGE}.html\n"
