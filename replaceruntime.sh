SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$SCRIPT_DIR" || exit 1

NUGET="nuget/microsoft.netcore.app.runtime.mono.multithread.browser-wasm/"

version=$(ls -v $NUGET | tail -n1)

echo "found version: $version"

ROOT="$(realpath "$NUGET/$version")"

rm -r "${ROOT:?}"/runtimes/browser-wasm/{lib,native}
unzip -q -o statics/dotnet.zip -d "${ROOT:?}"/
