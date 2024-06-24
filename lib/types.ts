export const ARENA_BLOCK_URL = "https://www.are.na/block/";
export const ARENA_APP_URL = "https://dev.are.na/oauth/applications";

export interface Channel {
	id: number;
	slug: string;
	title: string;
	body: string;
	length: number;
	status: string;
	class: string;
	base_class: string;
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

export interface Block {
	user: User;
	id: number;
	base_class: string;
	class: string;
	comment_count: number;
	connected_at: string;
	connected_by_user_id: number;
	connected_by_user_slug: string;
	connected_by_username: string;
	connection_id: number;
	content: string;
	content_html: string;
	created_at: string;
	description: string;
	description_html: string;
	embed: string;
	generated_title: string;
	position: number;
	slug: string;
	source: Source;
	title: string;
}
