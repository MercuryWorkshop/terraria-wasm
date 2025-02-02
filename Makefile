STATICS_RELEASE=9c3dd72e-5785-49f6-b648-cdcbb036fb7d
Profile=Release

statics:
	mkdir statics
	wget https://github.com/r58Playz/FNA-WASM-Build/releases/download/$(STATICS_RELEASE)/FAudio.a -O statics/FAudio.a
	wget https://github.com/r58Playz/FNA-WASM-Build/releases/download/$(STATICS_RELEASE)/FNA3D_Wrapped.a -O statics/FNA3D.a
	wget https://github.com/r58Playz/FNA-WASM-Build/releases/download/$(STATICS_RELEASE)/libmojoshader.a -O statics/libmojoshader.a
	wget https://github.com/r58Playz/FNA-WASM-Build/releases/download/$(STATICS_RELEASE)/SDL2.a -O statics/SDL2.a

clean:
	rm -rv statics obj bin || true

build: statics
	dotnet publish -c $(Profile) -v diag
	# microsoft messed up etc etc
	sed -i 's/FS_createPath("\/","usr\/share",!0,!0)/FS_createPath("\/usr","share",!0,!0)/' bin/$(Profile)/net9.0/publish/wwwroot/_framework/dotnet.runtime.*.js
	sed -i 's/var SDL2=Module\["SDL2"\];return SDL2.audioContext.sampleRate/return 1/' bin/$(Profile)/net9.0/publish/wwwroot/_framework/dotnet.native.*.js
	sed -i 's/SDL2===undefined||SDL2.capture===undefined/true/' bin/$(Profile)/net9.0/publish/wwwroot/_framework/dotnet.native.*.js
	sed -i 's/SDL2===undefined||SDL2.audio===undefined/true/' bin/$(Profile)/net9.0/publish/wwwroot/_framework/dotnet.native.*.js
	cp -rv bin/$(Profile)/net9.0/publish/wwwroot/_framework public/

serve: build
	pnpm dev
