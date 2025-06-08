import { epoxyFetch, EpxTcpWs, getWispUrl } from "../epoxy";
import { DotnetHostBuilder } from "./dotnetdefs";

export type Log = { color: string; log: string };
export const gameState: Stateful<{
	ready: boolean;
	loginstate: number;
	playing: boolean;
	qr: string | null;

	// these will NOT work with use()
	logbuf: Log[];
}> = $state({
	qr: null,
	ready: false,
	loginstate: 0,
	playing: false,
	logbuf: [],
});

const dotnet: DotnetHostBuilder = (
	await eval(`import("/_framework/dotnet.js")`)
).dotnet;
let exports: any;

// the funny custom rsa
// https://github.com/MercuryWorkshop/wispcraft/blob/main/src/connection/crypto.ts
function encryptRSA(data: Uint8Array, n: bigint, e: bigint): Uint8Array {
	const modExp = (base: bigint, exp: bigint, mod: bigint) => {
		let result = 1n;
		base = base % mod;
		while (exp > 0n) {
			if (exp % 2n === 1n) {
				result = (result * base) % mod;
			}
			exp = exp >> 1n;
			base = (base * base) % mod;
		}
		return result;
	};
	// thank you jippity
	const pkcs1v15Pad = (messageBytes: Uint8Array, n: bigint) => {
		const messageLength = messageBytes.length;
		const nBytes = Math.ceil(n.toString(16).length / 2);

		if (messageLength > nBytes - 11) {
			throw new Error("Message too long for RSA encryption");
		}

		const paddingLength = nBytes - messageLength - 3;
		const padding = Array(paddingLength).fill(0xff);

		return BigInt(
			"0x" +
			[
				"00",
				"02",
				...padding.map((byte) => byte.toString(16).padStart(2, "0")),
				"00",
				...Array.from(messageBytes).map((byte: any) =>
					byte.toString(16).padStart(2, "0")
				),
			].join("")
		);
	};
	const paddedMessage = pkcs1v15Pad(data, n);
	let int = modExp(paddedMessage, e, n);

	let hex = int.toString(16);
	if (hex.length % 2) {
		hex = "0" + hex;
	}

	// ????
	return new Uint8Array(
		Array.from(hex.match(/.{2}/g) || []).map((byte) => parseInt(byte, 16))
	);
}

export const realFetch = window.fetch;
export async function preInit() {
	console.debug("initializing dotnet");
	const runtime = await dotnet
		.withConfig({
			pthreadPoolInitialSize: 16,
		})
		.withEnvironmentVariable("MONO_SLEEP_ABORT_LIMIT", "99999")
		.withRuntimeOptions([
			// jit functions quickly and jit more functions
			`--jiterpreter-minimum-trace-hit-count=${500}`,

			// monitor jitted functions for less time
			`--jiterpreter-trace-monitoring-period=${100}`,

			// reject less funcs
			`--jiterpreter-trace-monitoring-max-average-penalty=${150}`,

			// increase jit function limits
			`--jiterpreter-wasm-bytes-limit=${64 * 1024 * 1024}`,
			`--jiterpreter-table-size=${32 * 1024}`,

			// print jit stats
			`--jiterpreter-stats-enabled`,
		])
		.withResourceLoader((type, _name, defaultUri, _integrity, behavior) => {
			// for split wasm
			if (type === "dotnetwasm" && behavior === "dotnetwasm") {
				return (async () => {
					let idx = 0;

					let fetchNext = async () => {
						let res = await realFetch(defaultUri + idx);
						idx++;
						if (!res.body) throw new Error("no body in fetch response");
						return res.status === 200 && !res.headers.get("content-type")
							? res.body.getReader()
							: null;
					};

					let chunk = await fetchNext();
					if (!chunk) throw new Error("failed to fetch first chunk");
					let currentStream: ReadableStreamDefaultReader<Uint8Array> = chunk;

					let stream = new ReadableStream({
						async pull(controller) {
							let { value, done } = await currentStream.read();
							if (done || !value) {
								chunk = await fetchNext();

								if (chunk) {
									currentStream = chunk;
									await this.pull!(controller);
								} else {
									controller.close();
								}
							} else {
								controller.enqueue(value);
							}
						},
					});

					let res = new Response(stream, {
						headers: new Headers({ "Content-Type": "application/wasm" }),
					});
					return res;
				})();
			}
		})
		.create();

	console.log("loading epoxy");
	window.WebSocket = new Proxy(WebSocket, {
		construct(t, a, n) {
			const url = new URL(a[0]);
			if (a[0] === getWispUrl() || url.host === location.host)
				return Reflect.construct(t, a, n);
			if (url.hostname.startsWith("__terraria_wisp_proxy_ws__"))
				return new EpxTcpWs(
					url.pathname.substring(1),
					url.hostname.replace("__terraria_wisp_proxy_ws__", "")
				);

			// @ts-expect-error
			return new EpxWs(...a);
		},
	});
	// @ts-expect-error
	window.fetch = epoxyFetch;

	const config = runtime.getConfig();
	exports = await runtime.getAssemblyExports(config.mainAssemblyName!);
	window.exports = exports;

	runtime.setModuleImports("interop.js", {
		encryptrsa: (
			publicKeyModulusHex: string,
			publicKeyExponentHex: string,
			data: Uint8Array
		) => {
			let modulus = BigInt("0x" + publicKeyModulusHex);
			let exponent = BigInt("0x" + publicKeyExponentHex);
			let encrypted = encryptRSA(data, modulus, exponent);
			return new Uint8Array(encrypted);
		},
	});

	runtime.setModuleImports("depot.js", {
		newqr: (qr: string) => {
			gameState.qr = qr;
		},
	});

	(self as any).wasm = {
		Module: runtime.Module,
		dotnet,
		runtime,
		config,
		exports,
	};

	console.debug("PreInit...");
	await runtime.runMain();
	await exports.Program.PreInit();
	console.debug("dotnet initialized");

	gameState.ready = true;
}

export async function initSteam(
	username: string | null,
	password: string | null,
	qr: boolean
) {
	return await exports.Steam.Init(username, password, qr);
}
export async function downloadApp() {
	return await exports.Steam.DownloadApp();
}

export async function play() {
	gameState.playing = true;

	console.debug("Init...");
	const before = performance.now();
	await exports.Program.Init(screen.width, screen.height);
	const after = performance.now();
	console.debug(`Init : ${(after - before).toFixed(2)}ms`);

	console.debug("MainLoop...");
	await exports.Program.MainLoop();
	console.debug("Cleanup...");

	await exports.Program.Cleanup();
	gameState.ready = false;
	gameState.playing = false;
}

useChange([gameState.playing], () => {
	try {
		if (gameState.playing) {
			// @ts-expect-error
			navigator.keyboard.lock();
		} else {
			// @ts-expect-error
			navigator.keyboard.unlock();
		}
	} catch (err) {
		console.log("keyboard lock error:", err);
	}
});

document.addEventListener("keydown", (e: KeyboardEvent) => {
	if (
		gameState.playing &&
		[
			"Space",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"Tab",
		].includes(e.code)
	) {
		e.preventDefault();
	}
});
