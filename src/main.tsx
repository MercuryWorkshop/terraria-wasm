import { gameState, play, preInit, TIMEBUF_SIZE } from "./game";

import { OpfsExplorer } from "./fs";

import iconPlayArrow from "@ktibow/iconset-material-symbols/play-arrow";
import iconFullscreen from "@ktibow/iconset-material-symbols/fullscreen";
import iconFolderOpen from "@ktibow/iconset-material-symbols/folder-open";
import { Dialog } from "./ui/Dialog";
import { Button, Icon, Link } from "./ui/Button";
export const NAME = "Terraria";

export const Logo: Component<{}, {}> = function() {
	this.css = `
		display: flex;
		align-items: center;
		font-size: 1.5rem;

		font-family: Andy Bold;

		img {
			image-rendering: pixelated;
			-ms-interpolation-mode: nearest-neighbor;
			width: 3rem;
			height: 3rem;
		}

		.extras {
			align-self: start;
			padding: 0.25rem 0;
			font-size: 1rem;
			color: var(--fg6);

			display: flex;
			flex-direction: column;
			justify-content: space-between;
		}
	`;
	return (
		<div>
			<img src="/app.ico" />
			<span>terrarium</span>
			<div class="extras">
				<span>v1.4.0.0</span>
			</div>
		</div>
	)
}

const TopBar: Component<{
	canvas: HTMLCanvasElement,
	fsOpen: boolean,
	achievementsOpen: boolean,
}, { allowPlay: boolean, fps: HTMLElement }> = function() {
	this.css = `
		padding: 0.5em;

		display: flex;
		align-items: stretch;
		gap: 0.5rem;

		.group {
			display: flex;
			align-items: center;
			gap: 1rem;
		}

		.expand { flex: 1; }

		@media (max-width: 750px) {
			& {
				flex-direction: column;
			}
			.group {
				justify-content: space-evenly;
			}
		}
	`;

	useChange([gameState.ready, gameState.playing], () => {
		this.allowPlay = gameState.ready && !gameState.playing;
	});

	this.mount = () => {
		setInterval(() => {
			if (gameState.playing) {
				const avgFrametime = gameState.timebuf.toArray().reduce((acc, x) => acc + x, 0) / TIMEBUF_SIZE;
				const avgFps = (1000 / avgFrametime).toFixed(0);
				this.fps.innerText = "" + avgFps;
			}
		}, 1000);
	}

	return (
		<div>
			<div class="group">
				<Logo />
				{$if(use(gameState.playing), <div>FPS: <span bind:this={use(this.fps)}></span></div>)}
			</div>
			<div class="expand" />
			<div class="group">
				{/* <Button on:click={() => this.achievementsOpen = true} icon="full" type="normal" disabled={false}>
					<Icon icon={iconTrophy} />
				</Button> */}
				<Button on:click={() => this.fsOpen = true} icon="full" type="normal" disabled={false}>
					<Icon icon={iconFolderOpen} />
				</Button>
				<Button on:click={async () => {
					try {
						(navigator as any).keyboard.lock();
						await this.canvas.requestFullscreen({ navigationUI: "hide" });
					} catch { }
				}} icon="full" type="normal" disabled={use(gameState.playing, x => !x)}>
					<Icon icon={iconFullscreen} />
				</Button>
				<Button on:click={() => {
					play();
				}} icon="left" type="primary" disabled={use(this.allowPlay, x => !x)}>
					<Icon icon={iconPlayArrow} />
					Play
				</Button>
			</div>
		</div>
	)
}

const BottomBar: Component<{}, {}> = function() {
	this.css = `
		background: var(--bg);
		border-top: 2px solid var(--surface1);
		padding: 0.5rem;
		font-size: 0.8rem;

		display: flex;
		align-items: center;
		justify-content: space-between;

		span {
			text-align: center;
		}

		@media (max-width: 750px) {
			& {
				flex-direction: column;
				gap: 0.5rem;
			}
		}
	`;

	return (
		<div>
			<span>Ported by <Link href="https://github.com/velzie">velzie</Link></span>
			<span>All game assets and code belong to <Link href="https://re-logic.com/">Re-Logic</Link> All rights reserved.</span>
		</div>
	)
}

const GameView: Component<{ canvas: HTMLCanvasElement }, {}> = function() {
	this.css = `
		aspect-ratio: 16 / 9;
		user-select: none;
		display: grid;
		grid-template-areas: "overlay";
		max-height: 90rem;

		div, canvas {
			grid-area: overlay;
			width: 100%;
			height: 100%;
		}

		div.started, canvas.stopped {
			display: none;
		}

		div {
			font-size: 2rem;
			font-weight: 570;

			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
		}

		canvas:fullscreen {
			border: none;
			border-radius: 0;
			background: black;
		}
	`;
	const div = use(gameState.playing, x => x ? "started" : "stopped");
	const canvas = use(gameState.playing, x => x ? "canvas started" : "canvas stopped");

	this.mount = () => {
		// dotnet will immediately transfer the canvas to deputy thread, so this.mount is required
		preInit();
	};

	return (
		<div class="tcontainer">
			<div class={div}>
				Game not running.
			</div>
			<canvas
				id="canvas"
				class={canvas}
				bind:this={use(this.canvas)}
				on:contextmenu={(e: Event) => e.preventDefault()}
			/>
		</div>
	)
}

export const LogView: Component<{}, {}> = function() {
	this.css = `
		height: 16rem;
		overflow: scroll;
		padding: 1em;
		background: var(--bg);

		font-family: var(--font-mono);

		::-webkit-scrollbar {
		  display: none;
    }
	`;

	const create = (color: string, log: string) => {
		const el = document.createElement("div");
		el.innerText = log;
		el.style.color = color;
		return el;
	}

	this.mount = () => {
		useChange([gameState.logbuf], () => {
			if (gameState.logbuf.length > 0) {
				for (const log of gameState.logbuf) {
					this.root.appendChild(create(log.color, log.log));
				}
				this.root.scrollTop = this.root.scrollHeight;
			}
		});
	};

	return (
		<div class="tcontainer">
		</div>
	)
}

export const Main: Component<{}, {
	canvas: HTMLCanvasElement,
	fsOpen: boolean,
	achievementsOpen: boolean,
}> = function() {
	this.css = `
		width: 100%;
		height: 100%;
		background: url(/backdrop.png);
		color: var(--fg);

		display: flex;
		flex-direction: column;
		overflow: scroll;

		.main {
			flex: 1;
			display: flex;
			flex-direction: column;
			padding: 1rem 0;

			gap: 1em;

			margin: auto;
			width: min(1300px, calc(100% - 2rem));
		}

		.main h2 {
			margin: 0;
		}
	`;

	this.fsOpen = false;
	this.achievementsOpen = false;

	return (
		<div>
			<TopBar
				canvas={use(this.canvas)}
				bind:fsOpen={use(this.fsOpen)}
				bind:achievementsOpen={use(this.achievementsOpen)}
			/>
			<div class="main">
				<GameView bind:canvas={use(this.canvas)} />
				<LogView />
			</div>
			<Dialog name="File System" bind:open={use(this.fsOpen)}>
				<OpfsExplorer open={use(this.fsOpen)} />
			</Dialog>
			<Dialog name="Achievements" bind:open={use(this.achievementsOpen)}>
			</Dialog>
			<BottomBar />
		</div>
	);
}
