/**
 * The tools under `/tools`, for the index page and the sidebar.
 *
 * @module
 */

export interface ToolMeta {
	/** The route segment under `/tools`. */
	name: string;
	title: string;
}

export const tools = [
	{ name: 'hash', title: 'BLAKE3 and SHA hashing' }
] as const satisfies ReadonlyArray<ToolMeta>;
