/**
 * The sections of the `/coherence/gaps` page, for the page, its column, and
 * the sidebar on narrow screens.
 *
 * @module
 */

import { families, family_ids } from './coherence.ts';

/** Each section's title by its anchor, in page order: a family each, then the two lists. */
export const gaps_sections: Record<string, string> = {
	...Object.fromEntries(family_ids.map((id) => [id, families[id].label])),
	actions: 'Actions nothing refuses',
	ci: 'Where CI runs less'
};
