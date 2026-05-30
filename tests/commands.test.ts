import { describe, it, expect } from "vitest";
import { getIDFromURL } from "../lib/Commands";

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
