export const ARENA_BLOCK_URL = "https://www.are.na/block/";
export const ARENA_APP_URL = "https://are.na/developers";

/**
 * Internal, normalized channel shape used throughout the plugin.
 * Mapped from the raw v3 response (see {@link ArenaChannel}) by `normalizeChannel`.
 */
export interface Channel {
	id: number;
	slug: string;
	title: string;
	length: number;
	body?: string;
	status?: string;
	contents?: Block[];
}

export interface Provider {
	name: string;
	url: string;
}

export interface Source {
	provider: Provider;
	title: string;
	url: string;
}

export interface Attachment {
	extension: string;
	file_name: string;
	file_size: number;
	file_size_display?: string;
	url: string;
}

export interface User {
	avatar: string;
	avatar_image: string;
	badge: string;
	base_class: string;
	can_index: boolean;
	channel_count: number;
	class: string;
	created_at: string;
	first_name: string;
	follower_count: number;
	following_count: number;
	full_name: string;
	id: number;
	initials: string;
	is_confirmed: boolean;
	is_exceeding_connections_limit: boolean;
	is_lifetime_premium: boolean;
	is_pending_confirmation: boolean;
	is_pending_reconfirmation: boolean;
	is_premium: boolean;
	is_supporter: boolean;
	last_name: string;
	metadata: object;
	profile_id: number;
	slug: string;
	username: string;
}

export interface URL {
	url: string;
}
export interface Image {
	content_type: string;
	display: URL;
	filename: string;
	large: URL;
	original: URL;
	square: URL;
	thumb: URL;
	updated_at: string;
}

/**
 * Internal, normalized block shape used throughout the plugin.
 *
 * The are.na API returns a different shape per version (see `ArenaBlock` for
 * the raw v3 response); `normalizeBlock` maps that raw shape into this one so
 * the rest of the plugin only ever deals with these fields.
 */
export interface Block {
	id: number;
	class: string;
	title: string;
	content: string;
	description: string;
	generated_title: string;
	position: number;
	image?: {
		display: { url: string };
		filename?: string;
		content_type?: string;
	};
	attachment?: Attachment;
	user?: { slug: string };
	source?: { title: string; url: string };
	// Embeddable media (YouTube, Vimeo, …): the ready-to-render iframe HTML.
	embed?: { html: string };
}

// --- Raw are.na v3 API response shapes ---

/** Text-like fields (content, description) are objects in v3, not strings. */
export interface ArenaText {
	markdown: string | null;
	html: string | null;
}

export interface ArenaImageSize {
	src: string;
}

export interface ArenaImage {
	src: string;
	large?: ArenaImageSize;
	medium?: ArenaImageSize;
	small?: ArenaImageSize;
	square?: ArenaImageSize;
	filename?: string;
	content_type?: string;
}

export interface ArenaAttachment {
	filename: string;
	file_extension: string;
	content_type: string;
	file_size: number;
	url: string;
}

export interface ArenaSource {
	url: string;
	title: string;
	provider?: Provider;
}

/**
 * oEmbed-style payload v3 returns for Embed (Media) blocks — YouTube/Vimeo
 * videos, audio, etc. `html` is the iframe markup we render into the note.
 */
export interface ArenaEmbed {
	url: string | null;
	type: string | null;
	title: string | null;
	author_name: string | null;
	author_url: string | null;
	source_url: string | null;
	thumbnail_url: string | null;
	width: number | null;
	height: number | null;
	html: string | null;
}

export interface ArenaUser {
	id: number;
	slug: string;
	name: string;
}

export interface ArenaConnection {
	id: number;
	position: number;
}

export interface ArenaBlock {
	id: number;
	type: string;
	base_type: string;
	title: string | null;
	content: ArenaText | null;
	description: ArenaText | null;
	image: ArenaImage | null;
	attachment: ArenaAttachment | null;
	embed: ArenaEmbed | null;
	source: ArenaSource | null;
	user: ArenaUser | null;
	connection: ArenaConnection | null;
}

export interface ArenaMeta {
	current_page: number;
	total_pages: number;
	total_count: number;
	per_page: number;
	next_page: number | null;
	prev_page: number | null;
	has_more_pages: boolean;
}

export interface ArenaContentsResponse {
	data: ArenaBlock[];
	meta: ArenaMeta;
}

export interface ArenaChannelCounts {
	blocks: number;
	channels: number;
	contents: number;
	collaborators: number;
}

export interface ArenaChannel {
	id: number;
	type: string;
	slug: string;
	title: string | null;
	description: ArenaText | string | null;
	visibility: string;
	counts: ArenaChannelCounts;
}

export interface ArenaChannelsResponse {
	data: ArenaChannel[];
	meta: ArenaMeta;
}
