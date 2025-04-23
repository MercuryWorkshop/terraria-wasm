import { Logo, LogView } from "./main";
import { Button, Icon, Link } from "./ui";
import { copyFolder, countFolder, extractTar, PICKERS_UNAVAILABLE, rootFolder } from "./fs";

import iconFolderOpen from "@ktibow/iconset-material-symbols/folder-open-outline";
import iconDownload from "@ktibow/iconset-material-symbols/download";
import iconEncrypted from "@ktibow/iconset-material-symbols/encrypted";
import { downloadApp, downloadDepot, gameState, initSteam } from "./game";

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
        You will need to own Terraria to play this. Make sure you either own it on Steam, or have it downloaded and installed on your computer.
      </div>

      <div>
        A <Link href="https://mercurywork.shop">Mercury Workshop</Link> Project. Ported by <Link href="https://velzie.rip">velzie</Link>
      </div>

      {PICKERS_UNAVAILABLE ?
        <div class="error">
          Your browser does not support the
          {' '}<Link href="https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker">File System Access API</Link>.{' '}
          You will be unable to copy your Terraria assets to play or use the upload features in the filesystem viewer. Please switch to a chromium based browser.
        </div>
        : null}

      <div style="flex: 1"></div>
      <div class="buttons">
        <Button on:click={() => this["on:next"]("copy")} type="primary" icon="left" disabled={PICKERS_UNAVAILABLE}>
          <Icon icon={iconFolderOpen} />
          {PICKERS_UNAVAILABLE ? "Copying local assets is unsupported" : "Copy local assets"}
        </Button>
        <Button on:click={() => this["on:next"]("download")} type="primary" icon="left" disabled={false}>
          <Icon icon={iconDownload} />
          Download Assets from Steam
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
        Select Terraria Content directory
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

  username: string,
  password: string,
}> = function() {
  this.username = "";
  this.password = "";

  this.css = `
		display: flex;
		flex-direction: column;
		gap: 1rem;
		font-size: 15pt;

		input[type="file"] {
			display: none;
		}

		.methods {
		  display: flex;
		  gap: 1rem;
		}
		.methods > div {
		  flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      padding: 1rem;
		}
		input {
		  color: var(--fg);
		  background: var(--bg);
		  border: 2px solid black;
		  border-radius: 0.5em;
		  padding: 0.25rem;

		  font-family: Andy Bold;
		  font-size: 18pt;
		}

		.spacer {
		      flex: 1;
		      margin-top: 0.5em;
		      margin-bottom: 0.5em;
		      border-bottom: 1px solid var(--fg);
    }

		h1, h3 {
		  text-align: center;
		  font-family: Andy Bold;
      padding: 0;
      margin: 0;
		}
		.logcontainer {
		  font-size: initial;
		}

		.qrcontainer {
		  display: flex;
      justify-content: center;
      flex-direction: column;
      align-items: center;
      width: 100%;
		}
		.qrcontainer img {
		  width: 40%;
		}
	`;

  const loginqr = async () => {
    gameState.loginstate = 1;
    let result = await initSteam(null, null, true);
    if (result != 0) {
      gameState.loginstate = 3;
    } else {
      gameState.loginstate = 2;
    }

  };

  const loginpass = async () => {
    gameState.loginstate = 1;
    let result = await initSteam(this.username, this.password, false);
    if (result != 0) {
      this.username = "";
      this.password = "";
      gameState.loginstate = 3;
    } else {
      gameState.loginstate = 2;
    }
  };
  const download = async () => {
    this.downloading = true;
    let result = await downloadApp();
  };

  return (
    <div>
      <h1>Steam Login</h1>
      <div>
        This will log into Steam through a proxy, so that it can download Terraria assets and achievement stats <br />
        The account details are encrpyted on your device and never sent to a server. Still, beware of unofficial deployments
      </div>

      {$if(use(gameState.loginstate, l => l == 0 || l == 3),
        <div class="methods">
          <div class="tcontainer">
            <h3>Username and Password</h3>
            <input bind:value={use(this.username)} placeholder="Username" />
            <input bind:value={use(this.password)} type="password" placeholder="Password" />
            <Button type="primary" icon="left" disabled={use(this.downloading)} on:click={loginpass}>
              <Icon icon={iconEncrypted} />
              Log In with Username and Password
            </Button>
          </div>
          <div class="tcontainer">
            <h3>Steam Guard QR Code</h3>
            Requires the Steam app on your phone to be installed. <br />
            <div style="flex: 1"></div>
            <Button type="primary" icon="left" disabled={use(this.downloading)} on:click={loginqr}>
              <Icon icon={iconEncrypted} />
              Log In with QR Code
            </Button>
          </div>
        </div>
      )}

      {$if(use(gameState.loginstate, l => l == 3),
        <div style="color: var(--error)">Failed to log in! Try again</div>
      )}

      {$if(use(gameState.loginstate, l => l == 3 || l == 1 || l == 2),
        <div class="logcontainer">
          <LogView />
        </div>
      )}

      {$if(use(gameState.loginstate, l => l == 1),
        <div class="qrcontainer">
          <p>Since this uses a proxy, the steam app might complain about your location being wrong. Just select the location that you don't usually log in from if it asks</p>
          {$if(use(gameState.qr),
            <img src={use(gameState.qr)} />
          )}

          {$if(use(gameState.qr),
            <div>Scan this QR code with the Steam app on your phone.</div>
          )}

        </div>
      )}

      {$if(use(gameState.loginstate, l => l == 2),
        <div>
          <Button type="primary" icon="left" disabled={use(this.downloading)} on:click={download}>
            <Icon icon={iconEncrypted} />
            Download Assets
          </Button>
        </div>
      )}

      {$if(use(this.downloading), <Progress percent={use(this.percent)} />)}
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
