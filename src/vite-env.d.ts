/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SIMPLE_DOWNLOAD: string;
	readonly VITE_SIMPLE_DOWNLOAD_FILE: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
