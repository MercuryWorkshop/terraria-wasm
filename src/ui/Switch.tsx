export const Switch: Component<
	{
		"on:change"?: (() => void) | ((e: InputEvent) => void);
		on: boolean;
		title: string;
		disabled: boolean;
		class?: string;
	},
	{}
> = function () {
	// @ts-expect-error
	this._leak = true;
	const transition = "background 0.2s, transform 0.2s, width 0.2s";

	this.css = `
		align-items: center;
		display: flex;
		justify-content: space-between;

		user-select: none;
		-webkit-user-select: none;

		.switch-container {
			position: relative;
			display: inline-block;
			width: 3.2rem;
			height: 1.8rem;
			flex: 0 0 auto;
			max-width: 3.2rem;
		}

		.switch-container input {
			opacity: 0;
			width: 0;
			height: 0;
			margin: 0;
		}

		.switch-slider {
			position: absolute;
			cursor: pointer;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background-color: var(--surface3);
			transition: ${transition};
			border-radius: 2rem;
			box-shadow: inset 0px 0px 5px -0.1px color-mix(in srgb, var(--fg) 10%, transparent), inset 0px -0.7px 1px 0px color-mix(in srgb, var(--fg) 17.5%, transparent);
		}

		.switch-slider::before {
			position: absolute;
			content: "";
			height: 1.4rem;
			width: 1.4rem;
			left: 0.2rem;
			bottom: 0.2rem;
			background-color: white;
			transition: ${transition};
			border-radius: 1.5rem;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		}

		input:checked + .switch-slider {
			background-color: var(--accent);
		}

		input:active + .switch-slider {
			background-color: var(--surface5);
		}

		.switch-container:hover input:checked:not(:disabled) + .switch-slider {
			background-color: color-mix(in srgb, var(--accent) 87.5%, var(--fg));
		}

		input:checked:active + .switch-slider {
			background-color: color-mix(in srgb, var(--accent) 70%, var(--fg));
		}

		.switch-container:hover input:not(:checked):not(:disabled) + .switch-slider {
			background-color: var(--surface4);
		}

		input:not(:disabled):active + .switch-slider::before {
			width: 1.7rem;
			transition: ${transition}
		}

		input:not(:disabled):checked:active + .switch-slider::before {
			transform: translateX(1.1rem);
		}

		input:disabled + .switch-slider {
			background-color: var(--surface0);
			cursor: not-allowed;
		}

		input:checked:disabled + .switch-slider {
			background-color: color-mix(in srgb, var(--accent) 50%, var(--surface3));
		}

		input:checked + .switch-slider::before {
			transform: translateX(1.4rem);
		}

		input:disabled + .switch-slider::before {
			background-color: color-mix(in srgb, #888888 92.5%, var(--accent));
		}

		input:checked:disabled + .switch-slider::before {
			background-color: color-mix(in srgb, #bbbbbb 92.5%, var(--accent));
		}
	`;

	return (
		<div class="component-switch">
			<span class="switch-label">{use(this.title)}</span>
			<label class={`switch-container component-switch ${this.class || ""}`}>
				<input
					type="checkbox"
					disabled={use(this.disabled)}
					bind:checked={use(this.on)}
					on:change={this["on:change"] || (() => {})}
				/>
				<span class="switch-slider"></span>
			</label>
		</div>
	);
};
