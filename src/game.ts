import { RingBuffer } from "ring-buffer-ts";
import CryptoJS from "crypto-js";
import { libcurl } from "libcurl.js";

export type Log = { color: string, log: string };
export const TIMEBUF_SIZE = 120;
export const gameState: Stateful<{
	ready: boolean,
	playing: boolean,

	// these will NOT work with use()
	logbuf: Log[],
	timebuf: RingBuffer<number>,
}> = $state({
	ready: false,
	playing: false,
	logbuf: [],
	timebuf: new RingBuffer<number>(TIMEBUF_SIZE)
});

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
		gameState.logbuf.push({
			color,
			log: `[${new Date().toISOString()}]: ${str}`
		});
		gameState.logbuf = gameState.logbuf;
	}
}
proxyConsole("error", "var(--error)");
proxyConsole("warn", "var(--warning)");
proxyConsole("log", "var(--fg)");
proxyConsole("info", "var(--info)");
proxyConsole("debug", "var(--fg6)");

function hookfmod() {
	let contexts: AudioContext[] = [];

	let ctx = AudioContext;
	(AudioContext as any) = function() {
		let context = new ctx();

		contexts.push(context);
		return context;
	};

	window.addEventListener("focus", async () => {
		for (let context of contexts) {
			try {
				await context.resume();
			} catch { }
		}
	});
	window.addEventListener("blur", async () => {
		for (let context of contexts) {
			try {
				await context.suspend();
			} catch { }
		}
	});
}
hookfmod();

const wasm = await eval(`import("/_framework/dotnet.js")`);
const dotnet = wasm.dotnet;
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
let timespentdecrypting = 0;

function wordArrayToUint8Array(wordarray: any) {
	var len = wordarray.words.length,
		view = new DataView(new ArrayBuffer(len * 4)),
		i = 0;
	for (; i < len; i++) {
		view.setInt32(i * 4, wordarray.words[i], false);
	}
	return new Uint8Array(view.buffer);
}

const wisp_url = "wss://anura.pro/wisp/";
export async function preInit() {


	console.debug("initializing dotnet");
	const runtime = await dotnet.withConfig({
		pthreadPoolInitialSize: 16,
	}).create();

	console.log("loading libcurl");
	await libcurl.load_wasm("https://cdn.jsdelivr.net/npm/libcurl.js@0.6.20/libcurl.wasm");
	libcurl.set_websocket(wisp_url);

	window.WebSocket = new Proxy(WebSocket, {
		construct(t, a, n) {
			if (a[0] === wisp_url)
				return Reflect.construct(t, a, n);

			return new libcurl.WebSocket(...a);
		}
	});
	window.fetch = libcurl.fetch;


	const config = runtime.getConfig();
	exports = await runtime.getAssemblyExports(config.mainAssemblyName);

	runtime.setModuleImports("interop.js", {
		decryptecb: (key: Uint8Array, data: Uint8Array) => {
			const ivEncryptedWordArray = CryptoJS.lib.WordArray.create(data);
			const keyWordArray = CryptoJS.lib.WordArray.create(key);

			const decryptedIV = CryptoJS.AES.decrypt(
				<any>{ ciphertext: ivEncryptedWordArray },
				keyWordArray,
				{
					mode: CryptoJS.mode.ECB,
					padding: CryptoJS.pad.NoPadding
				}
			);
			return wordArrayToUint8Array(decryptedIV);
		},
		decryptcbc: (key: Uint8Array, data: Uint8Array, iv: Uint8Array) => {
			const cbcDataWordArray = CryptoJS.lib.WordArray.create(data);
			const keyWordArray = CryptoJS.lib.WordArray.create(key);
			const ivWordArray = CryptoJS.lib.WordArray.create(iv);
			const decryptedData = CryptoJS.AES.decrypt(
				<any>{ ciphertext: cbcDataWordArray },
				keyWordArray,
				{
					iv: ivWordArray,
					mode: CryptoJS.mode.CBC,
					padding: CryptoJS.pad.Pkcs7
				}
			);
			let arr = wordArrayToUint8Array(decryptedData);

			const paddingLength = arr[arr.length - 1];
			arr = arr.slice(0, arr.length - paddingLength);
			if (arr[arr.length - 1] == 0) {
				arr = arr.slice(0, arr.length - 1);
			}

			return arr;
		},
		decryptcbc2: (key: Uint8Array, data: Uint8Array, iv: Uint8Array) => {
			let first = performance.now();
			const cbcDataWordArray = CryptoJS.lib.WordArray.create(data);
			const keyWordArray = CryptoJS.lib.WordArray.create(key);
			const ivWordArray = CryptoJS.lib.WordArray.create(iv);
			const decryptedData = CryptoJS.AES.decrypt(
				<any>{ ciphertext: cbcDataWordArray },
				keyWordArray,
				{
					iv: ivWordArray,
					mode: CryptoJS.mode.CBC,
					padding: CryptoJS.pad.Pkcs7
				}
			);
			const arr = wordArrayToUint8Array(decryptedData);
			const lastByte = arr[arr.length - 1];
			const paddingLength = lastByte;

			timespentdecrypting += performance.now() - first;

			return arr.slice(0, arr.length - paddingLength);
		},

		encryptrsa: (publicKeyModulusHex: string, publicKeyExponentHex: string, data: Uint8Array) => {
			let modulus = BigInt("0x" + publicKeyModulusHex);
			let exponent = BigInt("0x" + publicKeyExponentHex);
			let encrypted = encryptRSA(data, modulus, exponent);
			return new Uint8Array(encrypted);
		}
	});

	(self as any).wasm = {
		Module: dotnet.instance.Module,
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
};

export async function play() {
	gameState.playing = true;

	const before = performance.now();
	console.debug("Init...");
	await exports.Program.Init();
	const after = performance.now();
	console.debug(`Init : ${(after - before).toFixed(2)}ms`);

	console.debug("MainLoop...");
	const main = async () => {
		const before = performance.now();
		const ret = await exports.Program.MainLoop();
		const after = performance.now();

		gameState.timebuf.add(after - before);

		if (!ret) {
			console.debug("Cleanup...");

			gameState.timebuf.clear();

			await exports.Program.Cleanup();
			gameState.ready = false;
			gameState.playing = false;

			return;
		}

		requestAnimationFrame(main);
	}
	requestAnimationFrame(main);
}

useChange([gameState.playing], () => {
	try {
		if (gameState.playing) {
			// @ts-expect-error
			navigator.keyboard.lock()
		} else {
			// @ts-expect-error
			navigator.keyboard.unlock();
		}
	} catch (err) { console.log("keyboard lock error:", err); }
});

document.addEventListener("keydown", (e: KeyboardEvent) => {
	if (gameState.playing && ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)) {
		e.preventDefault();
	}
});
