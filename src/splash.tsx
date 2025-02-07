import { Logo } from "./main";
import { Button, Icon, Link } from "./ui";
import { copyFolder, countFolder, extractTar, PICKERS_UNAVAILABLE, rootFolder } from "./fs";

import iconFolderOpen from "@ktibow/iconset-material-symbols/folder-open-outline";
import iconDownload from "@ktibow/iconset-material-symbols/download";
import iconEncrypted from "@ktibow/iconset-material-symbols/encrypted";

const DECRYPT_INFO = import.meta.env.VITE_DECRYPT_ENABLED ? {
  key: import.meta.env.VITE_DECRYPT_KEY,
  path: import.meta.env.VITE_DECRYPT_PATH,
  compressed: import.meta.env.VITE_DECRYPT_PATH.endsWith(".gz"),
  size: parseInt(import.meta.env.VITE_DECRYPT_SIZE),
  count: parseInt(import.meta.env.VITE_DECRYPT_COUNT),
} : null;

(self as any).decrypt = DECRYPT_INFO;

const validateDirectory = async (directory: FileSystemDirectoryHandle) => {
  if (directory.name != "Content") {
    return "Directory name is not Content";
  }
  for (const child of ["Fonts", "Images", "Sounds"]) {
    try {
      await directory.getDirectoryHandle(child, { create: false });
    } catch {
      return `Failed to find subdirectory ${child}`
    }
  }
  return "";
};

const Intro: Component<{
  "on:next": (type: "copy" | "download") => void,
}, {}> = function() {
  this.css = `
		display: flex;
		flex-direction: column;
		gap: 1rem;
		height:100%;
		font-family: Andy Bold;

		.warning {
			color: var(--warning);
		}
		.error {
			color: var(--error);
		}

		.buttons {
		  display: flex;
		  align-self: end;
		  gap: 1rem;
		  width: 100%;
		  div {
		    width: 100%;
		  }
		}
	`;

  return (
    <div>
      <div>
        This is a port of <Link href="https://terraria.org">Terraria</Link> to the browser. Frontend and build system is heavily based on r58's <Link href="https://github.com/MercuryWorkshop/celeste-wasm">Celeste browser port</Link>
        <br />
        It needs around 0.6GB of memory and will probably not work on low-end devices.
      </div>

      <div>
        You will need to own Terraria to play this. Make sure you have it downloaded and installed on your computer.
      </div>

      <div>
        A <Link href="https://mercurywork.shop">Mercury Workshop</Link> Project. Ported by <Link href="https://velzie.rip">velzie</Link>
      </div>

      {PICKERS_UNAVAILABLE ?
        <div class="error">
          Your browser does not support the
          {' '}<Link href="https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker">File System Access API</Link>.{' '}
          You will be unable to copy your Terraria assets to play or use the upload features in the filesystem viewer.
        </div>
        : null}
      {DECRYPT_INFO ? null :
        <div class="error">
          This deployment of terraria-wasm does not have encrypted assets. You cannot download and decrypt them to play.
        </div>}
      {PICKERS_UNAVAILABLE && !DECRYPT_INFO ?
        <div class="error">
          You will have to switch browsers (to a Chromium-based one) to play as both methods of getting Terraria assets are unavailable.
        </div>
        : null}

      <div style="flex: 1"></div>
      <div class="buttons">
        <Button on:click={() => this["on:next"]("copy")} type="primary" icon="left" disabled={PICKERS_UNAVAILABLE}>
          <Icon icon={iconFolderOpen} />
          {PICKERS_UNAVAILABLE ? "Copying local assets is unsupported" : "Copy local assets"}
        </Button>
        <Button on:click={() => this["on:next"]("download")} type="primary" icon="left">
          <Icon icon={iconDownload} />
          {DECRYPT_INFO ? "Download and decrypt assets" : "Download and decrypt assets is disabled"}
        </Button>
      </div>
    </div>
  )
}

const Progress: Component<{ percent: number }, {}> = function() {
  this.css = `
		background: var(--surface1);
		border-radius: 1rem;
		height: 1rem;

		.bar {
			background: var(--accent);
			border-radius: 1rem;
			height: 1rem;
			transition: width 250ms;
		}
	`;

  return (
    <div><div class="bar" style={use`width:${this.percent}%`} /></div>
  )
}

const Copy: Component<{
  "on:done": () => void,
}, {
  copying: boolean,
  status: string,
  percent: number,
}> = function() {
  this.css = `
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	`;

  const opfs = async () => {
    const directory = await showDirectoryPicker();
    const res = await validateDirectory(directory);
    if (res) {
      this.status = res;
      return;
    }

    const max = await countFolder(directory);
    let cnt = 0;
    this.copying = true;
    const before = performance.now();
    await copyFolder(directory, rootFolder, (x) => {
      cnt++;
      this.percent = cnt / max * 100;
      console.debug(`copied ${x}: ${(cnt / max * 100).toFixed(2)}`);
    });
    const after = performance.now();
    console.debug(`copy took ${(after - before).toFixed(2)}ms`);

    await new Promise(r => setTimeout(r, 250));
    this["on:done"]();
  }

  return (
    <div>
      <div>
        Select your Terraria install's Content directory. It will be copied to browser storage and can be removed in the file manager.
      </div>
      <div>
        The Content directory for Steam installs of Terraria is usually located in one of these locations:
        <ul>
          <li><code>~/.steam/root/steamapps/common/Terraria </code></li>
          <li><code>C:\Program Files (x86)\Steam\steamapps\common\Terraria </code></li>
          <li><code>~/Library/Application Support/Steam/steamapps/common/Terraria</code></li>
        </ul>
      </div>
      {$if(use(this.copying), <Progress percent={use(this.percent)} />)}
      <Button on:click={opfs} type="primary" icon="left" disabled={use(this.copying)}>
        <Icon icon={iconFolderOpen} />
        Select Celeste Content directory
      </Button>
      {$if(use(this.status), <div class="error">{use(this.status)}</div>)}
    </div>
  )
}

export const Download: Component<{
  "on:done": () => void,
}, {
  downloading: boolean,
  status: string,
  percent: number,
  input: HTMLInputElement,
}> = function() {
  this.css = `
		display: flex;
		flex-direction: column;
		gap: 0.5rem;

		input[type="file"] {
			display: none;
		}
	`;

  const download = async () => {
    const self = this;
    let bytes = 0;
    let keyCursor = 0;
    let chunkCursor = 0;
    let count = 0;
    // const length = ("" + DECRYPT_INFO!.count).length;
    //
    // const inputPromise = new Promise<Uint8Array>((res, rej) => {
    //   const fileHandler = () => {
    //     this.input.removeEventListener("input", fileHandler);
    //     const file = this.input.files ? this.input.files[0] : null;
    //     if (!file) {
    //       rej(new Error("No file was provided"));
    //       return;
    //     }
    //
    //     const reader = new FileReader();
    //     reader.onload = () => {
    //       res(new Uint8Array(reader.result as ArrayBuffer));
    //     }
    //     reader.onerror = () => {
    //       rej(reader.error);
    //     }
    //     reader.readAsArrayBuffer(file);
    //   };
    //   this.input.addEventListener("input", fileHandler);
    // });
    // this.input.click();
    // const key = await inputPromise;
    //
    const root = await rootFolder.getDirectoryHandle("Content", { create: true });
    //
    // this.downloading = true;
    // const input = new ReadableStream({
    //   async pull(controller) {
    //     if (count >= DECRYPT_INFO!.count) {
    //       controller.close();
    //       return;
    //     }
    //
    //     const path = `${DECRYPT_INFO!.path}.${("" + count).padStart(length, '0')}`;
    //     console.log(`downloading path ${path}`);
    //     const resp = await fetch(path);
    //     if (!resp.body) throw new Error(`Failed to fetch ${path}`);
    //     const reader = resp.body.getReader();
    //
    //     while (true) {
    //       const { done, value } = await reader.read();
    //       if (done || !value) break;
    //
    //       controller.enqueue(value);
    //     }
    //
    //     count++;
    //   },
    // });
    // const decrypt = new TransformStream({
    //   async transform(chunk, controller) {
    //     while (chunkCursor < chunk.length) {
    //       chunk[chunkCursor] ^= key[keyCursor % key.length];
    //       chunkCursor += 4096;
    //       keyCursor += 4096;
    //     }
    //     chunkCursor -= chunk.length;
    //     controller.enqueue(chunk);
    //   }
    // });
    // const counter = new TransformStream({
    //   transform(chunk, controller) {
    //     bytes += chunk.length;
    //     self.percent = bytes / DECRYPT_INFO!.size * 100;
    //
    //     controller.enqueue(chunk);
    //   }
    // });
    // const decrypted = input.pipeThrough(decrypt).pipeThrough(counter);

    const decrypted = await fetch("assets.tar").then(resp => resp.body!);
    console.log(decrypted);

    let decompressed;
    // if (DECRYPT_INFO!.compressed) {
    // decompressed = decrypted.pipeThrough(new DecompressionStream("gzip"));
    // } else {
    decompressed = decrypted;
    // }

    const before = performance.now();
    await extractTar(decompressed, root, (type, name) => {
      console.log(`extracted ${type} "${name}"`);
    });
    const after = performance.now();
    console.log(`downloaded and extracted assets in ${(after - before).toFixed(2)}ms`);

    this["on:done"]();
  };
  // <div>
  //      {(DECRYPT_INFO!.size / (1024 * 1024)).toFixed(2)} MiB of {DECRYPT_INFO!.compressed ? "compressed" : ""} data will be downloaded and decrypted.
  //    </div>
  //    <div>
  //      Select <code>{DECRYPT_INFO!.key}</code> from your Celeste install's Content directory. It will be used to decrypt the download.
  //    </div>
  //    {$if(use(this.status), <div class="error">
  //      {use(this.status)}<br />You might have chosen the wrong decryption file. Please reload to try again.
  //    </div>)}
  //    {$if(use(this.downloading), <Progress percent={use(this.percent)} />)}
  //    <input type="file" bind:this={use(this.input)} />
  return (
    <div>
      <Button type="primary" icon="left" disabled={use(this.downloading)} on:click={download}>
        <Icon icon={iconEncrypted} />
        Select decryption file
      </Button>
    </div>
  )
}

export const Splash: Component<{
  "on:next": () => void,
}, {
  next: "" | "copy" | "download",
}> = function() {
  this.css = `
		position: relative;

		.splash, .blur, .main {
			position: absolute;
			width: 100%;
			height: 100%;
			top: 0;
			left: 0;
		}

		.splash {
			object-fit: cover;
			z-index: 1;
		}

		.blur {
			backdrop-filter: blur(0.5vw);
			z-index: 2;
		}

		.main {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			z-index: 3;
			padding-bottom: 5em;
		}

		.container {
			backdrop-filter: blur(0.5vw);
			width: min(50rem, 100%);
			flex: 1;
			margin: 0 1rem;
			padding: 1em;
			font-size: 18pt;

			color: var(--fg);

			display: flex;
			flex-direction: column;
			gap: 0.5rem;
		}

		.logo {
			display: flex;
			justify-content: center;
		}
	`;

  this.next = "";

  return (
    <div>
      <img class="splash" src="/backdrop.png" />
      <div class="blur" />
      <div class="main">
        <img src="logo.png" />
        <div class="container tcontainer">
          {use(this.next, x => {
            if (!x) {
              return <Intro on:next={(x) => this.next = x} />;
            } else if (x === "copy") {
              return <Copy on:done={this["on:next"]} />;
            } else {
              return <Download on:done={this["on:next"]} />;
            }
          })}
        </div>
      </div>
    </div>
  )
}
