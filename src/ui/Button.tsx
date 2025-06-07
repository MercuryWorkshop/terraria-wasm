import type { IconifyIcon } from "@iconify/types";

export const Icon: Component<{ icon: IconifyIcon; class?: string }, {}> =
	function () {
		// @ts-expect-error
		this._leak = true;
		this.mount = () => {
			this.root.innerHTML = this.icon.body;
			useChange([this.icon], () => {
				this.root.innerHTML = this.icon.body;
			});
		};
		return (
			<svg
				width="1em"
				height="1em"
				viewBox={use`0 0 ${this.icon.width} ${this.icon.height}`}
				xmlns="http://www.w3.org/2000/svg"
				class={`component-icon ${this.class}`}
			></svg>
		);
	};

export const Button: Component<
	{
		"on:click": (() => void) | ((e: PointerEvent) => void);

		class?: string;
		type: "primary" | "normal" | "listitem" | "listaction";
		icon: "full" | "left" | "none";
		disabled: boolean;
		label?: string;
		title?: string;
	},
	{
		children: any;
	}
> = function () {
	// @ts-expect-error
	this._leak = true;
	this.css = `
		button {
			display: flex;
			align-items: center;
			justify-content: center;

			width: 100%;
			height: 100%;

			padding: 0.5rem;

			transition: background 0.25s;
			font-family: var(--font-body);
			cursor: pointer;
			font-size: 13pt;
		}

		button.icon-full svg, button.icon-left svg {
			width: 1.5rem;
			height: 1.5rem;
		}
		button.icon-full {
		}
		button.icon-left {
			gap: 0.25rem;
		}

		button.type-primary {
			background: var(--bg);
			color: var(--fg);
		}
		button.type-normal {
			background: var(--bg);
			color: var(--fg);
		}
		button.type-listitem {
			background: transparent;
			color: var(--fg);
			border-radius: 0.5rem;
		}
		button.type-listaction {
			background: var(--bg);
			color: var(--fg);
		}

		button.type-primary:not(:disabled):hover {
			background: color-mix(in srgb, var(--bg) 95%, white);
		}
		button.type-primary:not(:disabled):active {
			background: color-mix(in srgb, var(--bg) 95%, white);
		}
		button.type-normal:not(:disabled):hover {
			background: var(--surface2);
		}
		button.type-normal:not(:disabled):active {
			background: var(--surface3);
		}
		button.type-listitem:not(:disabled):hover {
			background: var(--surface1);
		}
		button.type-listitem:not(:disabled):active {
			background: var(--surface2);
		}
		button.type-listaction:not(:disabled):hover {
			background: var(--surface3);
		}
		button.type-listaction:not(:disabled):active {
			background: var(--surface4);
		}

		button:disabled {
			background: var(--surface0);
			cursor: not-allowed;
		}
	`;
	return (
		<div>
			<button
				on:click={this["on:click"]}
				class={`tcontainer icon-${this.icon} type-${this.type} ${this.class}`}
				disabled={use(this.disabled)}
				title={use(this.title)}
				aria-label={this.label}
			>
				{use(this.children)}
			</button>
		</div>
	);
};
export const Link: Component<{ href: string }, { children: any[] }> =
	function () {
		return (
			<a href={this.href} class="component-link" target="_blank">
				{this.children}
			</a>
		);
	};
