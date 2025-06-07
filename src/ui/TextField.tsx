export const TextField: Component<
	{
		"on:keydown"?: (() => void) | ((e: KeyboardEvent) => void);
		value: string;
		placeholder?: string;
		class?: string;
		type?: string;
	},
	{}
> = function () {
	this.css = `
		border: 0.1rem solid var(--surface1);
		border-radius: 4rem;
		padding: 0.5rem;
		font-family: var(--font-body);
		padding-left: 0.75rem;
		transition: all 0.1s ease;
		color: var(--fg);
		font-size: 1.25rem;

		&:hover {
			transition: all 0.1s ease;
			border-color: var(--surface2);
		}

		&:focus {
			transition: all 0.1s ease;
			border-color: var(--accent);
		}

		::placeholder {
			color: var(--surface5);
		}
	`;

	return (
		<input
			type={this.type || "text"}
			class={`component-textfield ${this.class} tcontainer`}
			placeholder={`${this.placeholder}`}
			bind:value={use(this.value)}
			on:keydown={this["on:keydown"] || (() => {})}
		/>
	);
};
