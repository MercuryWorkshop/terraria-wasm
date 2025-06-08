STATICS_RELEASE=c93989e1-7585-4b18-ae46-51fceedf9aeb
Profile=Release
Aot=true
DOTNETFLAGS=--nodereuse:false

statics:
	mkdir statics
	wget https://github.com/r58Playz/FNA-WASM-Build/releases/download/$(STATICS_RELEASE)/FAudio.a -O statics/FAudio.a
	wget https://github.com/r58Playz/FNA-WASM-Build/releases/download/$(STATICS_RELEASE)/FNA3D.a -O statics/FNA3D.a
	wget https://github.com/r58Playz/FNA-WASM-Build/releases/download/$(STATICS_RELEASE)/libmojoshader.a -O statics/libmojoshader.a
	wget https://github.com/r58Playz/FNA-WASM-Build/releases/download/$(STATICS_RELEASE)/SDL3.a -O statics/SDL3.a
	wget https://github.com/r58Playz/FNA-WASM-Build/releases/download/$(STATICS_RELEASE)/libcrypto.a -O statics/libcrypto.a

terraria/Decompiled:
	bash tools/decompile.sh
terraria/Terraria: terraria/Decompiled
	bash tools/copydecompiled.sh
	bash tools/applypatches.sh Vanilla

node_modules:
	pnpm i

FNA:
	git clone https://github.com/FNA-XNA/FNA --recursive -b 25.02
	cd FNA && git apply ../FNA.patch
	cp FNA/lib/SDL3-CS/SDL3/SDL3.Legacy.cs SDL3.Legacy.cs

deps: statics node_modules FNA terraria/Terraria

# targets

clean:
	rm -rvf statics {terraria,SteamKit2.WASM/SteamKit/SteamKit2/SteamKit2,SteamKit2.WASM/protobuf-net/src/protobuf-net.Core}/{bin,obj} FNA node_modules || true

build: deps
	if [ $(Aot) != "true" ]; then\
		sed 's/\[DllImport(nativeLibName, EntryPoint = "SDL_CreateWindow", CallingConvention = CallingConvention\.Cdecl)\]/[DllImport(nativeLibName, EntryPoint = "SDL__CreateWindow", CallingConvention = CallingConvention.Cdecl)]/' < SDL3.Legacy.cs |\
		sed '/\[DllImport(nativeLibName, CallingConvention = CallingConvention.Cdecl)\]/ { N; s|\(\[DllImport(nativeLibName, CallingConvention = CallingConvention.Cdecl)\]\)\n\(.*SDL_GetWindowFlags.*\)|[DllImport(nativeLibName, CallingConvention = CallingConvention.Cdecl, EntryPoint = "SDL__GetWindowFlags")]\n\2| }'\
		> FNA/lib/SDL3-CS/SDL3/SDL3.Legacy.cs;\
	else\
		cp SDL3.Legacy.cs FNA/lib/SDL3-CS/SDL3/SDL3.Legacy.cs;\
	fi
#
	rm -r public/_framework terraria/bin/$(Profile)/net9.0/publish/wwwroot/_framework || true
	cd terraria && dotnet publish -c $(Profile) -v diag $(DOTNETFLAGS) /p:TerrariaWasmAot="$(Aot)"
	cp -r terraria/bin/$(Profile)/net9.0/publish/wwwroot/_framework public/_framework
#
	# microsoft messed up
	sed -i 's/FS_createPath("\/","usr\/share",!0,!0)/FS_createPath("\/usr","share",!0,!0)/' public/_framework/dotnet.runtime.*.js
	# sdl messed up
	sed -i 's/!window.matchMedia/!self.matchMedia/' public/_framework/dotnet.native.*.js
	# emscripten sucks
	sed -i 's/var offscreenCanvases={};/var offscreenCanvases={};if(globalThis.window\&\&!window.TRANSFERRED_CANVAS){transferredCanvasNames=[".canvas"];window.TRANSFERRED_CANVAS=true;}/' public/_framework/dotnet.native.*.js
	sed -i 's/var offscreenCanvases = {};/var offscreenCanvases={};if(globalThis.window\&\&!window.TRANSFERRED_CANVAS){transferredCanvasNames=[".canvas"];window.TRANSFERRED_CANVAS=true;}/' public/_framework/dotnet.native.*.js
	# emscripten sucks. like a lot
	bash fixwasm.sh
	cd public/_framework && split -b20M -d -a1 dotnet.native.*.wasm dotnet.native.*.wasm && rm dotnet.native.*.wasm

serve: build
	pnpm dev

publish: build
	pnpm build


.PHONY: clean build serve
