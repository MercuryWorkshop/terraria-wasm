# Terrarium

A port of Terraria to the browser using WebAssembly and [fna-wasm-threads](https://github.com/r58Playz/fna-wasm-threads)

Read the [writeup](https://velzie.rip/blog/celeste-wasm) for more information on how this works.
![image](https://github.com/user-attachments/assets/dae455c5-7eec-4473-9951-babc8a1b402e)

# I want to host this on my website

Go to the [releases page](https://github.com/MercuryWorkshop/terraria-wasm/releases) and download the latest release. Extract the contents of terraria-wasm-build.zip to your web server. Cross site isolation headers are required for this to work, so make sure your web server is configured to send the following headers:

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

# I want to build this

## Prerequisites

- A x86_64 Linux system
- dotnet 9.0.4
- the mono-devel package on your distro
- node and pnpm
- Terraria (Linux or Windows build)
- ilspycmd (SPECIFICALLY VERSION 9.0.0.7889)
  it's recommended to install ilspycmd using the .NET CLI

```bash
dotnet tool install --global ilspycmd --version 9.0.0.7889
```

## Building

1. Clone the repository (make sure you use --recursive!!)
2. Decompile Terraria

```bash
bash tools/decompile.sh ~/.local/share/Steam/steamapps/common/Terraria/Terraria.exe
```

3. Patch Terraria

```bash
bash tools/copydecompiled.sh
bash tools/applypatches.sh Vanilla
```

4. Build the project

```bash
make serve
```

To build the frontend for production, run:

```bash
make publish
```

<!--
To build with simple download (where the game assets are downloaded from the server)
```
VITE_SIMPLE_DOWNLOAD=true VITE_SIMPLE_DOWNLOAD_FILE=/terraria-wasm.tar make publish
```
and create a tar of the game assets, then put terraria-wasm.tar in `public/` (not static/, static refers to archive files)

Do not publicly host the game assets without permission from Re-Logic. This is for personal use only. -->

# I want to add mods

Right now performance is not good enough in dotnet interpreted/jiterpreter mode, which is required for [the MonoMod WASM port](https://github.com/r58Playz/MonoMod) to function.
Eventually it might be possible with improvements to the dotnet wasm jit or a "mixed aot" mode allowing for better FNA performance, but for now it isn't feasible
