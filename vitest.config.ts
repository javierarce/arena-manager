import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		alias: {
			// `obsidian` has no runtime implementation; point it at our stub.
			obsidian: path.resolve(process.cwd(), "tests/mocks/obsidian.ts"),
		},
	},
});
