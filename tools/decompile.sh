#!/usr/bin/env bash
set -euo pipefail
shopt -s inherit_errexit

which ilspycmd &> /dev/null || {
	echo "Please install ilspycmd."
	exit 1
}

ILSPY="ilspycmd: 9.0.0.7889"
if ! [[ "$(ilspycmd --version | head -1)" =~ ^"$ILSPY" ]]; then
	echo "Incorrect ilspycmd version: '$(ilspycmd --version | head -1)' != '$ILSPY'"
	exit 1
fi

if ! [[ "$#" -eq "1" ]]; then
	echo "usage: bash tools/decompile.sh <terraria.exe>"
	exit 1
fi

rm -r terraria/Decompiled terraria/libs terraria/{ReLogic,Terraria} || true
mkdir terraria/libs
cp "$(dirname "$1")"/{FNA,SteelSeriesEngineWrapper}.dll terraria/libs/
dotnet run --project extract-relogic/extract-relogic.csproj -- "$1" terraria/libs/
ilspycmd --nested-directories -r terraria/libs -lv CSharp11_0 -p -o terraria/Decompiled "$1"
ilspycmd --nested-directories -lv CSharp11_0 -p -o terraria/Decompiled terraria/libs/ReLogic.dll
rm -r \
	terraria/Decompiled/{Terraria,ReLogic}.csproj \
	terraria/Decompiled/ReLogic/{{OS,Localization/IME}/Windows,Localization/IME/WindowsIme.cs,Peripherals} \
	terraria/Decompiled/Terraria/{Social/WeGame,Initializers/ChromaInitializer.cs,GameContent/{RGB,ChromaHotkeyPainter.cs},Net/WeGameAddress.cs,{Control,Program,LinuxLaunch}.cs}
cp terraria/Decompiled/app.ico public/
cp -r terraria/Decompiled/{ReLogic,Terraria} terraria/
