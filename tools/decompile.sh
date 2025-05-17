#!/usr/bin/env bash
set -euo pipefail
shopt -s inherit_errexit

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

which ilspycmd &> /dev/null || {
	echo "Please install ilspycmd."
	exit 1
}

ILSPY="ilspycmd: 9.0.0.7889"
if ! [[ "$(ilspycmd --version | head -1)" =~ ^"$ILSPY" ]]; then
	echo "Incorrect ilspycmd version: '$(ilspycmd --version | head -1)' != '$ILSPY'"
	exit 1
fi

terraria=${1:-}
if [ ! -f "$terraria" ]; then
	echo "usage: bash tools/decompile.sh <terraria.exe>"
	echo "No terraria.exe specified or does not exist. Guessing default paths"
	defaults=(~/.steam/steam/steamapps/common/Terraria/Terraria.exe ~/.local/share/Steam/steamapps/common/Terraria/Terraria.exe)
	for terraria in "${defaults[@]}"; do
		if [ -f "$terraria" ]; then
			echo "Found terraria.exe at $terraria"
			break
		fi
	done
	if [ ! -f "$terraria" ]; then
		echo "Could not find terraria.exe. Please specify the path to terraria.exe as an argument."
		exit 1
	fi
fi


rm -r terraria/Decompiled terraria/libs terraria/{ReLogic,Terraria} || true
mkdir terraria/libs
cp "$(dirname "$terraria")"/{FNA,SteelSeriesEngineWrapper}.dll terraria/libs/
dotnet run --project extract-relogic/extract-relogic.csproj -- "$terraria" terraria/libs/
echo "if ilspy asks you to update it, do NOT LISTEN"
ilspycmd --nested-directories -r terraria/libs -lv CSharp11_0 -p -o terraria/Decompiled "$terraria"
ilspycmd --nested-directories -lv CSharp11_0 -p -o terraria/Decompiled terraria/libs/ReLogic.dll

rm -r \
	terraria/Decompiled/{Terraria,ReLogic}.csproj \
	terraria/Decompiled/ReLogic/{{OS,Localization/IME}/Windows,Localization/IME/WindowsIme.cs,Peripherals} \
	terraria/Decompiled/Terraria/{Social/WeGame,Initializers/ChromaInitializer.cs,GameContent/{RGB,ChromaHotkeyPainter.cs},Net/WeGameAddress.cs,{Control,Program,LinuxLaunch}.cs}
