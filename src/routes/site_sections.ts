/**
 * The site's top-level sections, in the order the sidebar and the landing
 * page list them. Each is a route of the same name.
 *
 * @module
 */

/** One top-level section of the site. */
export interface SiteSection {
	/** The route's name, `/skills` for `skills`. */
	name: string;
	/** The emoji the section goes by. */
	icon: string;
	/** One line saying what is there, shown on the landing page. */
	summary: string;
}

export const site_sections = [
	{
		name: 'skills',
		icon: '🧙',
		summary: 'agent skills: the fuz-stack conventions and the grimoire pattern'
	},
	{
		name: 'coherence',
		icon: '🪜',
		summary: 'how agent-written code goes wrong, and what holds each failure'
	},
	{
		name: 'values',
		icon: '⚖️',
		summary: "what the stack's design is measured against (a sketch)"
	},
	{
		name: 'projects',
		icon: '📦',
		summary: "each project of the stack, seen through this site's data"
	},
	{
		name: 'tools',
		icon: '🪄',
		summary: 'small tools that run in the browser'
	},
	{
		name: 'about',
		icon: '🔮',
		summary: 'this site, and links to the rest of Fuz'
	}
] as const satisfies ReadonlyArray<SiteSection>;

/** A section's name. */
export type SiteSectionName = (typeof site_sections)[number]['name'];
