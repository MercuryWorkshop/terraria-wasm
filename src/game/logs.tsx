import { gameState } from ".";

function proxyConsole(name: string, color: string) {
	// @ts-expect-error ts sucks
	const old = console[name].bind(console);
	// @ts-expect-error ts sucks
	console[name] = (...args) => {
		let str;
		try {
			str = args.join(" ");
		} catch {
			str = "<failed to render>";
		}
		old(...args);
		gameState.logbuf = [
			{
				color,
				log: `[${new Date().toISOString()}]: ${str}`,
			},
		];
	};
}
proxyConsole("error", "var(--error)");
proxyConsole("warn", "var(--warning)");
proxyConsole("log", "var(--fg)");
proxyConsole("info", "var(--info)");
proxyConsole("debug", "var(--fg6)");

export const LogView: Component<{}, {}> = function () {
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
	};

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

	return <div class="tcontainer"></div>;
};
