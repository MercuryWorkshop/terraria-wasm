STATICS_RELEASE=e97620f0-7022-49fe-845e-a28034d5d631
Profile=Release

statics:
	mkdir statics
	wget https://github.com/r58Playz/FNA-WASM-Build/releases/download/$(STATICS_RELEASE)/FAudio.a -O statics/FAudio.a
	wget https://github.com/r58Playz/FNA-WASM-Build/releases/download/$(STATICS_RELEASE)/FNA3D.a -O statics/FNA3D.a
	wget https://github.com/r58Playz/FNA-WASM-Build/releases/download/$(STATICS_RELEASE)/libmojoshader.a -O statics/libmojoshader.a
	wget https://github.com/r58Playz/FNA-WASM-Build/releases/download/$(STATICS_RELEASE)/SDL3.a -O statics/SDL3.a

clean:
	rm -rv statics obj bin

build: statics
	rm -rv public/_framework bin/$(Profile)/net9.0/publish/wwwroot/_framework || true
	dotnet publish -c $(Profile) -v diag
	cp -rv bin/$(Profile)/net9.0/publish/wwwroot/_framework public/_framework
	# microsoft messed up etc etc
	sed -i 's/FS_createPath("\/","usr\/share",!0,!0)/FS_createPath("\/usr","share",!0,!0)/' public/_framework/dotnet.runtime.*.js
	# sdl messed up
	sed -i 's/!window.matchMedia/!self.matchMedia/' public/_framework/dotnet.native.*.js
	# emscripten sucks
	sed -i 's/var offscreenCanvases={};/var offscreenCanvases={};if(globalThis.window\&\&!window.TRANSFERRED_CANVAS){transferredCanvasNames=[".canvas"];window.TRANSFERRED_CANVAS=true;}/' public/_framework/dotnet.native.*.js
	sed -i 's/var offscreenCanvases = {};/var offscreenCanvases={};if(globalThis.window\&\&!window.TRANSFERRED_CANVAS){transferredCanvasNames=[".canvas"];window.TRANSFERRED_CANVAS=true;}/' public/_framework/dotnet.native.*.js

serve: build
	pnpm dev
