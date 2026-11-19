/**
 * What the Fuz stack page says of each project besides what it is: the layer
 * it sits in, how far along it is, the languages it is written in, and its
 * site. Read from the stack page's data by `stack_snapshot.task.ts` and
 * committed as `stack_facets.json`, so a page here can group and mark the
 * projects in the stack page's terms without restating them.
 *
 * A project's tagline and a layer's blurb are left on the stack page, which
 * is where a project is described.
 *
 * @module
 */

import * as s from '@fuzdev/fuz_schema/schema.ts';

/** One status tier of the stack page, with the page's own gloss of it. */
export const StackStatus = s.object({
	id: s.string,
	label: s.string,
	description: s.string
});
export type StackStatus = s.Infer<typeof StackStatus>;

/** One implementation language of the stack page. */
export const StackLanguage = s.object({
	id: s.string,
	label: s.string
});
export type StackLanguage = s.Infer<typeof StackLanguage>;

/** One project as the stack page files it. */
export const StackProjectFacets = s.object({
	name: s.string,
	/** The name of its layer, one of `layers`. */
	layer: s.string,
	/** The id of its status, one of `statuses`. */
	status: s.string,
	/** The ids of its languages, most prominent first, each one of `languages`. */
	languages: s.array(s.string),
	/** Its docs or project site, when the stack page links one. */
	site: s.nullable(s.string)
});
export type StackProjectFacets = s.Infer<typeof StackProjectFacets>;

export const StackFacets = s.object({
	/** The day the stack page's data was last read, as an ISO date. */
	checked: s.string,
	/** The commit of the stack page's repo that it was read at. */
	commit: s.string,
	/** The layers' names, in the stack page's order, top down. */
	layers: s.array(s.string),
	/** In the stack page's order, furthest along first. */
	statuses: s.array(StackStatus),
	languages: s.array(StackLanguage),
	/** In the stack page's order. */
	projects: s.array(StackProjectFacets)
});
export type StackFacets = s.Infer<typeof StackFacets>;

/** The exports of the stack page's data module that the facets are read from. */
export const StackPageModule = s.loose_object({
	stack_layers: s.array(
		s.loose_object({
			name: s.string,
			pieces: s.array(
				s.loose_object({
					name: s.string,
					languages: s.array(s.string),
					status: s.string,
					site: s.optional(s.string)
				})
			)
		})
	),
	STACK_STATUSES: s.record(s.loose_object({ label: s.string, description: s.string })),
	STACK_LANGUAGES: s.record(s.loose_object({ label: s.string }))
});
export type StackPageModule = s.Infer<typeof StackPageModule>;

export interface StackFacetsResult {
	facets: Omit<StackFacets, 'checked' | 'commit'>;
	/** What does not line up. A caller writes nothing when this is not empty. */
	problems: Array<string>;
}

/**
 * Builds the facets from the stack page's data.
 *
 * @param names - this site's list of the stack's projects, which the stack page's must equal
 */
export const build_stack_facets = (
	module: StackPageModule,
	names: ReadonlyArray<string>
): StackFacetsResult => {
	const problems: Array<string> = [];
	const statuses = Object.entries(module.STACK_STATUSES).map(([id, status]) => ({
		id,
		label: status.label,
		description: status.description
	}));
	const languages = Object.entries(module.STACK_LANGUAGES).map(([id, language]) => ({
		id,
		label: language.label
	}));
	const projects = module.stack_layers.flatMap((layer) =>
		layer.pieces.map((piece) => {
			if (!statuses.some((status) => status.id === piece.status)) {
				problems.push(`${piece.name} has a status the stack page does not define: ${piece.status}`);
			}
			for (const language of piece.languages) {
				if (!languages.some((l) => l.id === language)) {
					problems.push(`${piece.name} has a language the stack page does not define: ${language}`);
				}
			}
			return {
				name: piece.name,
				layer: layer.name,
				status: piece.status,
				languages: piece.languages,
				site: piece.site ?? null
			};
		})
	);
	const found = projects.map((project) => project.name);
	if (found.join() !== names.join()) {
		problems.push(
			`the stack page lists ${found.join(', ')}, and this site's list is ${names.join(', ')}`
		);
	}
	return {
		facets: {
			layers: module.stack_layers.map((layer) => layer.name),
			statuses,
			languages,
			projects
		},
		problems
	};
};
