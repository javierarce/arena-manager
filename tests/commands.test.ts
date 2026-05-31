import { describe, it, expect } from "vitest";
import { getIDFromURL, getSlugFromURL } from "../lib/Commands";

describe("getIDFromURL", () => {
	it("extracts the id from a full are.na block URL", () => {
		expect(getIDFromURL("https://www.are.na/block/12345")).toBe(12345);
		expect(getIDFromURL("are.na/block/678")).toBe(678);
	});

	it("accepts a bare numeric id", () => {
		expect(getIDFromURL("42")).toBe(42);
	});

	it("returns null when there is no id to parse", () => {
		expect(getIDFromURL("https://are.na/someone/a-channel")).toBeNull();
		expect(getIDFromURL("not a url")).toBeNull();
		expect(getIDFromURL("")).toBeNull();
	});

	it("parses 0 (the caller is responsible for rejecting non-positive ids)", () => {
		expect(getIDFromURL("0")).toBe(0);
	});
});

describe("getSlugFromURL", () => {
	it("extracts the slug from a full are.na channel URL", () => {
		expect(getSlugFromURL("https://www.are.na/someone/a-channel")).toBe(
			"a-channel",
		);
		expect(getSlugFromURL("are.na/someone/my-channel-abc123")).toBe(
			"my-channel-abc123",
		);
	});

	it("accepts a bare slug", () => {
		expect(getSlugFromURL("my-channel-abc123")).toBe("my-channel-abc123");
	});

	it("ignores query strings, hashes, and trailing slashes", () => {
		expect(getSlugFromURL("https://www.are.na/someone/a-channel/")).toBe(
			"a-channel",
		);
		expect(getSlugFromURL("https://www.are.na/someone/a-channel?foo=bar")).toBe(
			"a-channel",
		);
		expect(getSlugFromURL("are.na/someone/a-channel#section")).toBe(
			"a-channel",
		);
	});

	it("trims surrounding whitespace", () => {
		expect(getSlugFromURL("  a-channel  ")).toBe("a-channel");
	});

	it("returns null for block URLs and bare ids (those aren't channels)", () => {
		expect(getSlugFromURL("https://www.are.na/block/12345")).toBeNull();
		expect(getSlugFromURL("12345")).toBeNull();
	});

	it("returns null when there is no slug to parse", () => {
		expect(getSlugFromURL("")).toBeNull();
		expect(getSlugFromURL("   ")).toBeNull();
	});
});
