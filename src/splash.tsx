import { NAME } from "./main";
import { Button, Icon, Link } from "./ui/Button";
import {
	copyFolder,
	copyFolderForBadBrowsers,
	countFolder,
	countFolderForBadBrowsers,
	extractTar,
	FSAPI_UNAVAILABLE,
	PICKERS_UNAVAILABLE,
	rootFolder,
	TAR_TYPES,
} from "./fs";
import { downloadApp, gameState, initSteam, realFetch } from "./game";
import { LogView } from "./game/logs";
import { TextField } from "./ui/TextField";
import { store } from "./store";

import iconFolderOpen from "@ktibow/iconset-material-symbols/folder-open-outline";
import iconCloudUpload from "@ktibow/iconset-material-symbols/cloud-upload";
import iconFolderZip from "@ktibow/iconset-material-symbols/folder-zip-outline";
import iconDownload from "@ktibow/iconset-material-symbols/download";
import iconArchive from "@ktibow/iconset-material-symbols/archive";
import iconEncrypted from "@ktibow/iconset-material-symbols/encrypted";

const validateDirectory = async (directory: FileSystemDirectoryHandle) => {
	if (directory.name != "Content") {
		return "Directory name is not Content";
	}
	for (const child of ["Fonts", "Images", "Sounds"]) {
		try {
			await directory.getDirectoryHandle(child, { create: false });
		} catch {
			return `Failed to find subdirectory ${child}`;
		}
	}
	return "";
};
const validateDirectoryForBadBrowsers = async (
	entry: FileSystemEntry | null
) => {
	if (!entry || !entry.isDirectory) {
		return "what?";
	}
	let directory = entry as FileSystemDirectoryEntry;
	if (directory.name != "Content") {
		return "Directory name is not Content";
	}
	let reader = directory.createReader();
	return new Promise<string>((resolve) => {
		reader.readEntries((entries: FileSystemEntry[]) => {
			for (const child of ["Fonts", "Images", "Sounds"]) {
				if (!entries.some((e) => e.name === child && e.isDirectory)) {
					resolve(`Failed to find subdirectory Content/${child}`);
					return;
				}
			}
		});
		resolve("");
	});
};

const Intro: Component<
	{
		"on:next": (
			type: "copy" | "download" | "simpledownload" | "extract"
		) => void;
	},
	{
		starting: boolean;
	}
> = function () {
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

		@media (max-width: 825px) {
			.buttons {
				flex-direction: column;
				gap: 0.5rem;
			}
		}
	`;

	const next = (stage: "copy" | "download" | "simpledownload" | "extract") => {
		this.starting = true;
		this["on:next"](stage);
	};

	return (
		<div>
			<div>
				This is a port of <Link href="https://terraria.org">Terraria</Link> to
				the browser with WebAssembly. Frontend and build system is heavily based
				on r58's{" "}
				<Link href="https://github.com/MercuryWorkshop/celeste-wasm">
					Celeste browser port
				</Link>
				.
			</div>
			<div>
				A <Link href="https://mercurywork.shop">Mercury Workshop</Link> Project.
				Ported by <Link href="https://velzie.rip">velzie</Link>. Want to know
				more about how this was made? Check the{" "}
				<Link href="https://velzie.rip/blog/celeste-wasm/">writeup</Link>!
			</div>

			{!import.meta.env.VITE_SIMPLE_DOWNLOAD ? (
				<div>
					You will need to own Terraria to play this. Make sure you either own
					it on Steam, or have it downloaded and installed on your computer.
				</div>
			) : (
				<div>
					THIS IS AN UNOFFICIAL DEPLOYMENT OF Terrarium. I (velzie) AM NOT
					HOSTING THE GAME CONTENT HERE. You can find the official deployment{" "}
					<Link href="https://terraria.mercurywork.shop">here</Link>
				</div>
			)}

			{!import.meta.env.VITE_SIMPLE_DOWNLOAD && PICKERS_UNAVAILABLE ? (
				<div class="error">
					Your browser does not support the{" "}
					<Link href="https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker">
						File System Access API
					</Link>
					. You will be unable to extract a {NAME} archive to play or use the
					upload/download features in the filesystem viewer. Please switch to a
					chromium based browser.
				</div>
			) : null}
			{!import.meta.env.VITE_SIMPLE_DOWNLOAD && FSAPI_UNAVAILABLE ? (
				<div class="error">
					Your browser does not support the{" "}
					<Link href="https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/webkitGetAsEntry">
						File and Directory Entries API
					</Link>
					. You will be unable to copy game assets from your local install of
					Terraria.
				</div>
			) : null}

			<div>
				You will need to install Terraria to your browser with one of the
				following methods:
			</div>
			<div class="buttons">
				{import.meta.env.VITE_SIMPLE_DOWNLOAD ? (
					<Button
						on:click={() => next("simpledownload")}
						type="primary"
						icon="left"
						disabled={use(this.starting)}
					>
						<Icon icon={iconDownload} />
						Download Terraria
					</Button>
				) : (
					[
						<Button
							on:click={() => next("copy")}
							type="primary"
							icon="left"
							disabled={use(this.starting, (x) => x || FSAPI_UNAVAILABLE)}
						>
							<Icon icon={iconFolderOpen} />
							{FSAPI_UNAVAILABLE
								? "Copying local assets is unsupported"
								: "Copy local assets"}
						</Button>,
						<Button
							on:click={() => this["on:next"]("download")}
							type="primary"
							icon="left"
							disabled={use(this.starting)}
						>
							<Icon icon={iconDownload} />
							Download assets from Steam
						</Button>,
						<Button
							on:click={() => this["on:next"]("extract")}
							type="primary"
							icon="left"
							disabled={use(this.starting, (x) => x || PICKERS_UNAVAILABLE)}
						>
							<Icon icon={iconArchive} />
							{PICKERS_UNAVAILABLE
								? `Extracting ${NAME} archive is unsupported`
								: `Extract ${NAME} archive`}
						</Button>,
					]
				)}
			</div>
		</div>
	);
};

const Progress: Component<{ percent: number }, {}> = function () {
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
		<div>
			<div class="bar" style={use`width:${this.percent}%`} />
		</div>
	);
};

const Copy: Component<
	{
		"on:done": () => void;
	},
	{
		copying: boolean;
		status: string;
		percent: number;
	}
> = function () {
	this.css = `
		display: flex;
		flex-direction: column;
		gap: 0.5rem;

		code {
			font-size: 18px;
		}

		.droparea {
			position: relative;
			border: 2px dashed color-mix(in srgb, var(--bg) 75%, var(--surface6));
			color: var(--fg6);
			font-size: 1.05rem;
			font-weight: 500;
			border-radius: 1rem;
			padding: 2rem;
			text-align: center;
			background: color-mix(in srgb, var(--bg) 45%, transparent);
			transition: border-color 0.2s ease;
		}

		.droparea.true {
			pointer-events: none;
			cursor: no-drop;

			* {
				cursor: no-drop;
			}

			background:  color-mix(in srgb, var(--bg-sub) 45%, transparent);
			color: var(--surface6);
			border-color: color-mix(in srgb, var(--bg) 75%, var(--surface4));
		}

		.droparea.dragover {
			border-color: var(--accent);
			color: color-mix(in srgb, var(--fg3) 92%, var(--accent));
			.dnd-bg-hover {
				transition: background-image 0.35s ease;
				background-image: radial-gradient(
					circle at center,
					color-mix(in srgb, var(--accent) 25%, transparent),
					transparent
				);
			}
		}

		.dnd-bg-hover {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			border-radius: 1rem;
			z-index: 9;
			transition: background-image 0.35s ease;
			background-image: radial-gradient(
				circle at center,
				color-mix(in srgb, var(--surface3) 5%, transparent),
				transparent
			);
		}

		.dnd-content {
			z-index: 10;
			position: relative;
		}

		.dnd-icon {
			font-size: 2.65rem;
		}
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
			this.percent = (cnt / max) * 100;
			console.debug(`copied ${x}: ${((cnt / max) * 100).toFixed(2)}`);
		});
		const after = performance.now();
		console.debug(`copy took ${(after - before).toFixed(2)}ms`);

		await new Promise((r) => setTimeout(r, 250));
		await rootFolder.getFileHandle(".ContentExists", { create: true });
		this["on:done"]();
	};
	const opfsForBadBrowsers = async (transfer: DataTransferItem) => {
		// mdn told me to check for this
		let handle: FileSystemEntry | null;
		if (
			"getAsEntry" in transfer &&
			typeof (transfer as any).getAsEntry === "function"
		) {
			handle = (transfer as any).getAsEntry();
		} else {
			handle = transfer.webkitGetAsEntry();
		}

		const res = await validateDirectoryForBadBrowsers(handle);
		if (res) {
			this.status = res;
			return;
		}

		const contentFolder = handle as FileSystemDirectoryEntry;
		const max = await countFolderForBadBrowsers(contentFolder);
		let cnt = 0;
		this.copying = true;
		const before = performance.now();
		await copyFolderForBadBrowsers(contentFolder, rootFolder, (x) => {
			cnt++;
			this.percent = (cnt / max) * 100;
			console.debug(`copied ${x}: ${((cnt / max) * 100).toFixed(2)}`);
		});
		const after = performance.now();
		console.debug(`copy took ${(after - before).toFixed(2)}ms`);

		await new Promise((r) => setTimeout(r, 250));
		await rootFolder.getFileHandle(".ContentExists", { create: true });
		this["on:done"]();
	};

	return (
		<div>
			<div>
				Select your Terraria install's Content directory. It will be copied to
				browser storage and can be removed in the file manager.
			</div>
			<div>
				The Content directory for Steam installs of Terraria is usually located
				in one of these locations:
				<ul>
					<li>
						<code>~/.steam/root/steamapps/common/Terraria </code>
					</li>
					<li>
						<code>C:\Program Files (x86)\Steam\steamapps\common\Terraria </code>
					</li>
					<li>
						<code>
							~/Library/Application Support/Steam/steamapps/common/Terraria
						</code>
					</li>
				</ul>
			</div>
			{$if(use(this.copying), <Progress percent={use(this.percent)} />)}
			<Button
				on:click={opfs}
				type="primary"
				icon="left"
				disabled={use(this.copying, (x) => x || PICKERS_UNAVAILABLE)}
			>
				<Icon icon={iconFolderOpen} />
				{PICKERS_UNAVAILABLE
					? "Selecting Terraria Content directory is unsupported"
					: "Select Terraria Content directory"}
			</Button>
			<div
				class={use`droparea ${this.copying}`}
				on:drop={async (e: DragEvent) => {
					(
						(e.currentTarget || e.target) as HTMLElement | null
					)?.classList.remove("dragover");
					e.preventDefault();
					if (!e.dataTransfer || !e.dataTransfer.items || this.copying) return;
					const transfer = e.dataTransfer.items[0];
					await opfsForBadBrowsers(transfer);
				}}
				on:dragover={(e: DragEvent) => {
					e.preventDefault();
					e.dataTransfer!.dropEffect = "copy";
					if (this.copying) return;
					((e.currentTarget || e.target) as HTMLElement).classList.add(
						"dragover"
					);
				}}
				on:dragleave={(e: DragEvent) => {
					(
						(e.currentTarget || e.target) as HTMLElement | null
					)?.classList.remove("dragover");
				}}
			>
				<div class="dnd-bg-hover"></div>
				<div class="dnd-content">
					<Icon icon={iconCloudUpload} class="dnd-icon" />
					{PICKERS_UNAVAILABLE ? (
						<p>Drag and drop Terraria Content directory</p>
					) : (
						<p>Or, drag and drop one here</p>
					)}
				</div>
			</div>
			{$if(use(this.status), <div class="error">{use(this.status)}</div>)}
		</div>
	);
};

const Extract: Component<
	{
		"on:done": () => void;
	},
	{
		extracting: boolean;
		status: string;
		percent: number;
	}
> = function () {
	this.css = `
		/* hacky */
		.center svg {
			transform: translateY(15%);
		}
	`;

	const opfs = async () => {
		const files = await showOpenFilePicker({
			excludeAcceptAllOption: true,
			types: TAR_TYPES,
		});
		const fileHandle = files[0];

		const file = await fileHandle.getFile();

		let parsedSize = 0;
		const fileSize = file.size;

		const stream = file.stream();
		const reader = stream.getReader();
		const self = this;
		let progressStream = new ReadableStream({
			async pull(controller) {
				const { value, done } = await reader.read();

				if (!value || done) {
					controller.close();
				} else {
					controller.enqueue(value);

					parsedSize += value.byteLength;
					self.percent = (parsedSize / fileSize) * 100;
				}
			},
		});

		this.extracting = true;

		if (fileHandle.name.endsWith(".gz"))
			progressStream = progressStream.pipeThrough(
				new DecompressionStream("gzip")
			);

		await extractTar(progressStream, rootFolder, (type, name) =>
			console.log(`untarred ${type} ${name}`)
		);

		this.extracting = false;

		await rootFolder.getFileHandle(".ContentExists", { create: true });
		this["on:done"]();
	};

	return (
		<div class="step">
			<p class="center">
				Select a {NAME} exported .tar archive of the root directory. You can
				create this on a browser with {NAME} already set-up by clicking the
				archive button (<Icon icon={iconArchive} />) in the filesystem explorer
				while in the root directory.
			</p>
			{$if(use(this.extracting), <Progress percent={use(this.percent)} />)}
			<Button
				on:click={opfs}
				type="primary"
				icon="left"
				disabled={use(this.extracting, (x) => x)}
			>
				<Icon icon={iconFolderZip} />
				Select {NAME} archive
			</Button>
			{$if(use(this.status), <div class="error">{use(this.status)}</div>)}
		</div>
	);
};

const SimpleDownload: Component<
	{
		"on:done": () => void;
	},
	{
		extracting: boolean;
		status: string;
		percent: number;
	}
> = function () {
	this.css = `
		/* hacky */
		.center svg {
			transform: translateY(15%);
		}
	`;

	this.mount = async () => {
		try {
			let url = new URL(
				import.meta.env.VITE_SIMPLE_DOWNLOAD_FILE,
				location.href
			).href;
			let file = await realFetch(url);
			console.log(file);
			if (file.status != 200) {
				throw new Error(
					`Failed to download file: ${file.status} ${file.statusText}`
				);
			}
			let parsedSize = 0;
			const fileSize = parseInt(file.headers.get("Content-Length")!);
			const stream = file.body!;
			const reader = stream.getReader();
			const self = this;
			let progressStream = new ReadableStream({
				async pull(controller) {
					const { value, done } = await reader.read();

					if (!value || done) {
						controller.close();
					} else {
						controller.enqueue(value);

						parsedSize += value.byteLength;
						self.percent = (parsedSize / fileSize) * 100;
					}
				},
			});

			this.extracting = true;

			if (url.endsWith(".gz"))
				progressStream = progressStream.pipeThrough(
					new DecompressionStream("gzip")
				);
			await extractTar(progressStream, rootFolder, (type, name) => {
				console.log(`extracted ${type} ${name}`);
			});

			this.extracting = false;
			await rootFolder.getFileHandle(".ContentExists", { create: true });
			this["on:done"]();
		} catch (e) {
			this.status = `Failed to download file: ${e}`;
			this.extracting = false;
			console.error(e);
		}
	};

	return (
		<div class="step">
			<p class="center">Downloading {NAME} from the server</p>
			{$if(use(this.extracting), <Progress percent={use(this.percent)} />)}
			{$if(use(this.status), <div class="error">{use(this.status)}</div>)}
		</div>
	);
};

export const Download: Component<
	{
		"on:done": () => void;
	},
	{
		downloading: boolean;
		status: string;
		percent: number;
		input: HTMLInputElement;

		username: string;
		password: string;
	}
> = function () {
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
		await downloadApp();
	};

	return (
		<div>
			<h1>Steam Login</h1>
			<div>
				This will log into Steam through a proxy, so that it can download
				Terraria assets and achievement stats <br />
				The account details are encrpyted on your device and never sent to a
				server. Still, beware of unofficial deployments
			</div>

			{$if(
				use(gameState.loginstate, (l) => l == 0 || l == 3),
				<div class="methods">
					<div class="tcontainer">
						<h3>Username and Password</h3>
						<input bind:value={use(this.username)} placeholder="Username" />
						<input
							bind:value={use(this.password)}
							type="password"
							placeholder="Password"
						/>
						<Button
							type="primary"
							icon="left"
							disabled={use(this.downloading)}
							on:click={loginpass}
						>
							<Icon icon={iconEncrypted} />
							Log In with Username and Password
						</Button>
					</div>
					<div class="tcontainer">
						<h3>Steam Guard QR Code</h3>
						Requires the Steam app on your phone to be installed. <br />
						<div style="flex: 1"></div>
						<Button
							type="primary"
							icon="left"
							disabled={use(this.downloading)}
							on:click={loginqr}
						>
							<Icon icon={iconEncrypted} />
							Log In with QR Code
						</Button>
					</div>
				</div>
			)}

			{$if(
				use(gameState.loginstate, (l) => l == 3),
				<div style="color: var(--error)">Failed to log in! Try again</div>
			)}

			{$if(
				use(gameState.loginstate, (l) => l == 3 || l == 1 || l == 2),
				<div class="logcontainer">
					<LogView />
				</div>
			)}

			{$if(
				use(gameState.loginstate, (l) => l == 1),
				<div class="qrcontainer">
					<p>
						Since this uses a proxy, the steam app might complain about your
						location being wrong. Just select the location that you don't
						usually log in from if it asks
					</p>
					{$if(use(gameState.qr), <img src={use(gameState.qr)} />)}

					{$if(
						use(gameState.qr),
						<div>Scan this QR code with the Steam app on your phone.</div>
					)}
				</div>
			)}

			{$if(
				use(gameState.loginstate, (l) => l == 2),
				<div>
					<Button
						type="primary"
						icon="left"
						disabled={use(this.downloading)}
						on:click={download}
					>
						<Icon icon={iconEncrypted} />
						Download assets
					</Button>
				</div>
			)}

			{$if(use(this.downloading), <Progress percent={use(this.percent)} />)}
		</div>
	);
};

export const Splash: Component<
	{
		"on:next": () => void;
		start: () => Promise<void>;
	},
	{
		next: "" | "copy" | "download" | "extract" | "simpledownload";
	}
> = function () {
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
			padding: 0.5em;
		}

		.container {
			backdrop-filter: blur(0.5vw);
			width: min(50rem, 100%);
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

		.wisp {
			display: flex;
			gap: 0.5em;
			align-items: center;
		}
		.wisp input {
			flex: 1;
		}

		.logo {
			display: flex;
			align-items: center;
		}

		.logo img {
			width: 100%;
			height: auto;
			aspect-ratio: 3.01;
		}
	`;

	this.next = "";

	return (
		<div>
			<img class="splash" src="/backdrop.webp" alt="Terraria art background" />
			<div class="blur" />
			<div class="main">
				<div class="logo">
					<img
						src="/logo.webp"
						alt="Terraria logo"
						width="421"
						height="140"
						fetchpriority="high"
					/>
				</div>
				<div class="container tcontainer">
					{use(this.next, (x) => {
						if (!x) {
							return (
								<Intro
									on:next={async (x) => {
										await this.start();
										this.next = x;
									}}
								/>
							);
						} else if (x === "copy") {
							return <Copy on:done={this["on:next"]} />;
						} else if (x === "extract") {
							return <Extract on:done={this["on:next"]} />;
						} else if (x === "simpledownload") {
							return <SimpleDownload on:done={this["on:next"]} />;
						} else if (x === "download") {
							return <Download on:done={this["on:next"]} />;
						}
					})}
					<div class="wisp">
						<span>Wisp Proxy Server:</span>
						<TextField bind:value={use(store.wisp)} />
					</div>
				</div>
			</div>
		</div>
	);
};
