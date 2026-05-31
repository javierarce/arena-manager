import { vi } from "vitest";

// The `obsidian` package ships only type declarations (no runtime), and the
// plugin marks it external at build time. Tests alias `obsidian` to this module
// so anything the code under test imports from it resolves to a stub.
export const requestUrl = vi.fn();

// Minimal stand-ins for the vault types the plugin imports. They only need to
// exist so `import { TFile, ... } from "obsidian"` resolves and `instanceof`
// checks work against fixtures built in the tests.
export class TAbstractFile {
	path = "";
	name = "";
}

export class TFile extends TAbstractFile {
	basename = "";
	extension = "";
}

export class TFolder extends TAbstractFile {
	children: TAbstractFile[] = [];
}

// `Settings.ts` and `Modals.ts` extend these Obsidian base classes at
// module-evaluation time, so importing anything from those files pulls them in.
// They only need to be constructable; their UI behavior is never exercised.
export class PluginSettingTab {
	constructor(_app?: unknown, _plugin?: unknown) {}
}

export class Setting {}

export class Modal {
	constructor(_app?: unknown) {}
}

export class SuggestModal {
	constructor(_app?: unknown) {}
}

export class FuzzySuggestModal {
	constructor(_app?: unknown) {}
}

export class Notice {
	constructor(_message?: string) {}
}

export class Events {}
