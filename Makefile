STATICS_RELEASE=e97620f0-7022-49fe-845e-a28034d5d631
Profile=Release

statics:
	mkdir statics
	wget https://github.com/r58Playz/FNA-WASM-Build/releases/download/$(STATICS_RELEASE)/FAudio.a -O statics/FAudio.a
	wget https://github.com/r58Playz/FNA-WASM-Build/releases/download/$(STATICS_RELEASE)/FNA3D.a -O statics/FNA3D.a
	wget https://github.com/r58Playz/FNA-WASM-Build/releases/download/$(STATICS_RELEASE)/libmojoshader.a -O statics/libmojoshader.a
	wget https://github.com/r58Playz/FNA-WASM-Build/releases/download/$(STATICS_RELEASE)/SDL3.a -O statics/SDL3.a

terraria/Decompiled:
	bash tools/decompile.sh

node_modules:
	pnpm i

FNA:
	git clone https://github.com/FNA-XNA/FNA --recursive
	cd FNA && git checkout 3ee5399 && git apply ../FNA.patch
	cp FNA/lib/SDL3-CS/SDL3/SDL3.Legacy.cs SDL3.Legacy.cs



# targets

patch: terraria/Decompiled FNA
	bash tools/applypatches.sh Vanilla

clean:
	rm -rv statics obj bin FNA node_modules

build: statics node_modules FNA terraria/Decompiled
	if [ $(Profile) = "Debug" ]; then\
		sed 's/\[DllImport(nativeLibName, EntryPoint = "SDL_CreateWindow", CallingConvention = CallingConvention\.Cdecl)\]/[DllImport(nativeLibName, EntryPoint = "SDL__CreateWindow", CallingConvention = CallingConvention.Cdecl)]/' < SDL3.Legacy.cs |\
		sed '/\[DllImport(nativeLibName, CallingConvention = CallingConvention.Cdecl)\]/ { N; s|\(\[DllImport(nativeLibName, CallingConvention = CallingConvention.Cdecl)\]\)\n\(.*SDL_GetWindowFlags.*\)|[DllImport(nativeLibName, CallingConvention = CallingConvention.Cdecl, EntryPoint = "SDL__GetWindowFlags")]\n\2| }'\
		> FNA/lib/SDL3-CS/SDL3/SDL3.Legacy.cs;\
	else\
		cp SDL3.Legacy.cs FNA/lib/SDL3-CS/SDL3/SDL3.Legacy.cs;\
	fi
	rm -r public/_framework bin/$(Profile)/net9.0/publish/wwwroot/_framework || true
	cd terraria && dotnet publish -c $(Profile) -v diag
	cp -r terraria/bin/$(Profile)/net9.0/publish/wwwroot/_framework public/_framework
	# microsoft messed up
	sed -i 's/FS_createPath("\/","usr\/share",!0,!0)/FS_createPath("\/usr","share",!0,!0)/' public/_framework/dotnet.runtime.*.js
	# sdl messed up
	sed -i 's/!window.matchMedia/!self.matchMedia/' public/_framework/dotnet.native.*.js
	# emscripten sucks
	sed -i 's/var offscreenCanvases={};/var offscreenCanvases={};if(globalThis.window\&\&!window.TRANSFERRED_CANVAS){transferredCanvasNames=[".canvas"];window.TRANSFERRED_CANVAS=true;}/' public/_framework/dotnet.native.*.js
	sed -i 's/var offscreenCanvases = {};/var offscreenCanvases={};if(globalThis.window\&\&!window.TRANSFERRED_CANVAS){transferredCanvasNames=[".canvas"];window.TRANSFERRED_CANVAS=true;}/' public/_framework/dotnet.native.*.js

serve: build
	pnpm dev


.PHONY: patch clean build serve
