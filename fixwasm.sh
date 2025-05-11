set -euo pipefail

wasm2wat --enable-all public/_framework/dotnet.native.*.wasm > wasm.wat

(
	cd patch || exit 1
	dotnet run -c Release ../wasm.wat ../wasmreplaced.wat
)

wat2wasm --enable-all wasmreplaced.wat -o public/_framework/dotnet.native.*.wasm
rm wasm.wat wasmreplaced.wat
jq --arg a "sha256-$(openssl dgst -sha256 -binary public/_framework/dotnet.native.*.wasm | openssl base64 -A)" '.resources.wasmNative[.resources.wasmNative | keys[0]] = $a' public/_framework/blazor.boot.json > blazor.boot.json
mv blazor.boot.json public/_framework/blazor.boot.json
