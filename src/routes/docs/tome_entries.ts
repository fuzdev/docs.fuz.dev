/**
 * The docs tomes as data, without their page components, so the site's
 * sidebar can list them without importing the docs section. `tomes.ts` adds
 * the components.
 *
 * @module
 */

import type { Tome } from '@fuzdev/fuz_ui/tome.ts';

/** A tome without its component. */
export type TomeEntry = Omit<Tome, 'Component'>;

export const tome_entries = [
	{
		slug: 'introduction',
		category: 'guide',
		related_tomes: ['fuz-stack', 'grimoire', 'stack'],
		related_modules: [],
		related_declarations: []
	},
	{
		slug: 'fuz-stack',
		category: 'skills',
		related_tomes: ['stack'],
		related_modules: [],
		related_declarations: []
	},
	{
		slug: 'grimoire',
		category: 'skills',
		related_tomes: ['fuz-stack'],
		related_modules: [],
		related_declarations: []
	},
	{
		slug: 'stack',
		category: 'reference',
		related_tomes: ['api'],
		related_modules: [],
		related_declarations: []
	},
	{
		slug: 'api',
		category: 'reference',
		related_tomes: ['stack'],
		related_modules: [],
		related_declarations: []
	}
] as const satisfies Array<TomeEntry>;

/** A tome's slug. */
export type TomeSlug = (typeof tome_entries)[number]['slug'];
