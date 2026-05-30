import { vi } from "vitest";

// The `obsidian` package ships only type declarations (no runtime), and the
// plugin marks it external at build time. Tests alias `obsidian` to this module
// so anything the code under test imports from it resolves to a stub.
export const requestUrl = vi.fn();
