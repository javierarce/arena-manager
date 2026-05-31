import { describe, it, expect, beforeEach, vi } from "vitest";
import { requestUrl } from "obsidian";
import Arena from "../lib/Arena";
import type { Settings } from "../lib/Settings";
import page1 from "./fixtures/contents-page1.json";
import page2 from "./fixtures/contents-page2.json";
import channelsPage1 from "./fixtures/channels-page1.json";
import channelsPage2 from "./fixtures/channels-page2.json";

const settings = {
	accessToken: "test-token",
	username: "tester",
	folder: "arena",
	download_attachments_type: "1",
} as Settings;

const mockRequestUrl = vi.mocked(requestUrl);

describe("Arena.getBlocksFromChannel", () => {
	beforeEach(() => {
		mockRequestUrl.mockReset();
	});

	it("paginates until has_more_pages is false", async () => {
		mockRequestUrl
			.mockResolvedValueOnce({ status: 200, json: page1 } as never)
			.mockResolvedValueOnce({ status: 200, json: page2 } as never);

		const arena = new Arena(settings);
		const blocks = await arena.getBlocksFromChannel("some-channel");

		// page1 has has_more_pages: true, page2 has false -> exactly two requests.
		expect(mockRequestUrl).toHaveBeenCalledTimes(2);
		expect(blocks).toHaveLength(5);
	});

	it("requests the v3 endpoint with per=100 and incrementing pages", async () => {
		mockRequestUrl
			.mockResolvedValueOnce({ status: 200, json: page1 } as never)
			.mockResolvedValueOnce({ status: 200, json: page2 } as never);

		const arena = new Arena(settings);
		await arena.getBlocksFromChannel("some-channel");

		const firstUrl = mockRequestUrl.mock.calls[0][0].url;
		const secondUrl = mockRequestUrl.mock.calls[1][0].url;

		expect(firstUrl).toContain(
			"https://api.are.na/v3/channels/some-channel/contents",
		);
		expect(firstUrl).toContain("per=100");
		expect(firstUrl).toContain("page=1");
		expect(secondUrl).toContain("page=2");
	});

	it("sends the bearer token", async () => {
		mockRequestUrl.mockResolvedValueOnce({
			status: 200,
			json: page2,
		} as never);

		const arena = new Arena(settings);
		await arena.getBlocksFromChannel("some-channel");

		expect(mockRequestUrl.mock.calls[0][0].headers).toMatchObject({
			Authorization: "Bearer test-token",
		});
	});

	it("returns normalized blocks sorted by position descending", async () => {
		mockRequestUrl
			.mockResolvedValueOnce({ status: 200, json: page1 } as never)
			.mockResolvedValueOnce({ status: 200, json: page2 } as never);

		const arena = new Arena(settings);
		const blocks = await arena.getBlocksFromChannel("some-channel");

		const positions = blocks.map((b) => b.position);
		expect(positions).toEqual([...positions].sort((a, b) => b - a));
		// Normalized shape: v3 `type` became `class`.
		expect(blocks.every((b) => typeof b.class === "string")).toBe(true);
	});

	it("throws on a non-200 response", async () => {
		mockRequestUrl.mockResolvedValueOnce({
			status: 401,
			json: {},
		} as never);

		const arena = new Arena(settings);
		await expect(
			arena.getBlocksFromChannel("some-channel"),
		).rejects.toThrow("Status: 401");
	});
});

describe("Arena.getChannelsFromUser", () => {
	beforeEach(() => {
		mockRequestUrl.mockReset();
	});

	it("requests the v3 user-contents endpoint filtered to channels", async () => {
		mockRequestUrl.mockResolvedValueOnce({
			status: 200,
			json: channelsPage2,
		} as never);

		const arena = new Arena(settings);
		await arena.getChannelsFromUser();

		const url = mockRequestUrl.mock.calls[0][0].url;
		expect(url).toContain("https://api.are.na/v3/users/tester/contents");
		expect(url).toContain("type=Channel");
		expect(url).toContain("per=100");
	});

	it("defaults to the signed-in user but accepts another username", async () => {
		mockRequestUrl.mockResolvedValueOnce({
			status: 200,
			json: channelsPage2,
		} as never);

		const arena = new Arena(settings);
		await arena.getChannelsFromUser("someone-else");

		const url = mockRequestUrl.mock.calls[0][0].url;
		expect(url).toContain(
			"https://api.are.na/v3/users/someone-else/contents",
		);
		expect(url).not.toContain("/users/tester/");
	});

	it("paginates and normalizes every channel", async () => {
		mockRequestUrl
			.mockResolvedValueOnce({ status: 200, json: channelsPage1 } as never)
			.mockResolvedValueOnce({
				status: 200,
				json: channelsPage2,
			} as never);

		const arena = new Arena(settings);
		const channels = await arena.getChannelsFromUser();

		expect(mockRequestUrl).toHaveBeenCalledTimes(2);
		expect(channels).toHaveLength(3);
		// Normalized: each has a numeric length sourced from counts.contents.
		expect(channels.every((c) => typeof c.length === "number")).toBe(true);
		expect(channels.every((c) => typeof c.slug === "string")).toBe(true);
	});

	it("swallows errors and returns what it has (legacy behavior)", async () => {
		mockRequestUrl.mockResolvedValueOnce({
			status: 401,
			json: {},
		} as never);

		const arena = new Arena(settings);
		const channels = await arena.getChannelsFromUser();
		expect(channels).toEqual([]);
	});
});

describe("Arena.getChannel", () => {
	beforeEach(() => {
		mockRequestUrl.mockReset();
	});

	const rawChannel = channelsPage1.data[0];

	it("fetches a single channel by slug and normalizes it", async () => {
		mockRequestUrl.mockResolvedValueOnce({
			status: 200,
			json: rawChannel,
		} as never);

		const arena = new Arena(settings);
		const channel = await arena.getChannel(rawChannel.slug);

		const call = mockRequestUrl.mock.calls[0][0];
		expect(call.url).toContain(
			`https://api.are.na/v3/channels/${rawChannel.slug}`,
		);
		expect(call.headers).toMatchObject({
			Authorization: "Bearer test-token",
		});
		// Normalized: counts.blocks -> length, visibility -> status.
		expect(channel.slug).toBe(rawChannel.slug);
		expect(channel.title).toBe(rawChannel.title);
		expect(channel.length).toBe(rawChannel.counts.blocks);
	});

	it("throws the are.na error message on a failure status", async () => {
		mockRequestUrl.mockResolvedValueOnce({
			status: 404,
			json: { title: "Not Found" },
		} as never);

		const arena = new Arena(settings);
		await expect(arena.getChannel("missing-channel")).rejects.toThrow(
			"Not Found",
		);
	});
});

describe("Arena.getBlockWithID", () => {
	beforeEach(() => {
		mockRequestUrl.mockReset();
	});

	it("fetches from the v3 blocks endpoint and normalizes the result", async () => {
		// A single v3 block (Link, from the fixtures) returned bare, not wrapped in `data`.
		const rawBlock = page1.data[3];
		mockRequestUrl.mockResolvedValueOnce({
			status: 200,
			json: rawBlock,
		} as never);

		const arena = new Arena(settings);
		const block = await arena.getBlockWithID(1829595);

		const url = mockRequestUrl.mock.calls[0][0].url;
		expect(url).toContain("https://api.are.na/v3/blocks/1829595");
		// Normalized: v3 `type` -> `class`, and image.display.url is present.
		expect(block.class).toBe("Link");
		expect(block.generated_title).toBeTruthy();
	});
});

describe("Arena.updateBlockWithContentAndBlockID", () => {
	beforeEach(() => {
		mockRequestUrl.mockReset();
	});

	it("PUTs to the v3 blocks endpoint with title/content/description", async () => {
		mockRequestUrl.mockResolvedValueOnce({ status: 200, json: {} } as never);

		const arena = new Arena(settings);
		await arena.updateBlockWithContentAndBlockID(42, "My title", "body", {
			description: "a description",
		});

		const call = mockRequestUrl.mock.calls[0][0];
		expect(call.url).toBe("https://api.are.na/v3/blocks/42");
		expect(call.method).toBe("PUT");
		const body = JSON.parse(call.body);
		expect(body).toMatchObject({
			title: "My title",
			content: "body",
			description: "a description",
		});
	});

	it("strips frontmatter from content before sending", async () => {
		mockRequestUrl.mockResolvedValueOnce({ status: 200, json: {} } as never);

		const arena = new Arena(settings);
		await arena.updateBlockWithContentAndBlockID(
			42,
			"t",
			"---\nblockid: 1\n---\nactual body",
			{},
		);

		const body = JSON.parse(mockRequestUrl.mock.calls[0][0].body);
		expect(body.content).toBe("actual body");
	});

	it("keeps `---` in the body (only the leading frontmatter is stripped)", async () => {
		mockRequestUrl.mockResolvedValueOnce({ status: 200, json: {} } as never);

		const arena = new Arena(settings);
		await arena.updateBlockWithContentAndBlockID(
			42,
			"t",
			"---\nblockid: 1\n---\nbefore\n\n---\n\nafter",
			{},
		);

		const body = JSON.parse(mockRequestUrl.mock.calls[0][0].body);
		expect(body.content).toBe("before\n\n---\n\nafter");
	});

	it("throws the are.na error message on a failure status", async () => {
		mockRequestUrl.mockResolvedValueOnce({
			status: 422,
			json: { message: "Content is invalid" },
		} as never);

		const arena = new Arena(settings);
		await expect(
			arena.updateBlockWithContentAndBlockID(42, "t", "body", {}),
		).rejects.toThrow("Content is invalid");
	});
});

describe("Arena.createBlockWithContentAndTitle", () => {
	beforeEach(() => {
		mockRequestUrl.mockReset();
	});

	it("POSTs to /v3/blocks with `value` and channel_ids", async () => {
		mockRequestUrl.mockResolvedValueOnce({
			status: 201,
			json: { id: 1 },
		} as never);

		const arena = new Arena(settings);
		await arena.createBlockWithContentAndTitle(
			"some text",
			"Generated Title",
			"my-channel",
			{},
		);

		const call = mockRequestUrl.mock.calls[0][0];
		expect(call.url).toBe("https://api.are.na/v3/blocks");
		expect(call.method).toBe("POST");
		const body = JSON.parse(call.body);
		// v3: content -> value, channel moved from URL into channel_ids (accepts slugs).
		expect(body.value).toBe("some text");
		expect(body.title).toBe("Generated Title");
		expect(body.channel_ids).toEqual(["my-channel"]);
	});

	it("prefers the frontmatter title over the generated title", async () => {
		mockRequestUrl.mockResolvedValueOnce({
			status: 201,
			json: { id: 1 },
		} as never);

		const arena = new Arena(settings);
		await arena.createBlockWithContentAndTitle("t", "Generated", "ch", {
			title: "Frontmatter Title",
		});

		const body = JSON.parse(mockRequestUrl.mock.calls[0][0].body);
		expect(body.title).toBe("Frontmatter Title");
	});

	it("throws the are.na error message on a failure status", async () => {
		mockRequestUrl.mockResolvedValueOnce({
			status: 404,
			json: { title: "Not Found" },
		} as never);

		const arena = new Arena(settings);
		await expect(
			arena.createBlockWithContentAndTitle("t", "g", "missing-channel", {}),
		).rejects.toThrow("Not Found");
	});
});
