#!/usr/bin/env bash
set -euo pipefail
shopt -s inherit_errexit

which diff &> /dev/null || {
	echo "Please install diff."
	exit 1
}

if ! [[ -d "terraria/Decompiled" ]]; then
	echo "Please run tools/decompile.sh first"
fi

if ! [[ "$#" -eq "1" ]]; then
	echo "usage: bash tools/genpatches.sh <dir>"
	exit 1
fi

rm -r "terraria/Patches/$1" || true

DECOMPDIR="terraria/Decompiled/"
find "$DECOMPDIR"{Terraria,ReLogic} -type f -name "*.cs" | while read -r file; do
	file="${file#${DECOMPDIR}}"
	patch="terraria/Patches/$1/$file.patch"


	mkdir -p "$(dirname "$patch")"
	diff=$(diff -u --label "$DECOMPDIR$file" --label "terraria/$file" "$DECOMPDIR$file" "terraria/$file" || true)

	if [ -n "$diff" ]; then
		echo "writing diff for $file"
		echo "$diff" > "$patch"
	fi
done
