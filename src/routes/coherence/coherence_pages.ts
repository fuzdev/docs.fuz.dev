/**
 * The pages of the `/coherence` section: its index, a page per family of
 * failures, a page per inventory, and the page of gaps. The sidebar, the index and every link
 * between the pages read these, and each path is literal so `resolve` checks
 * it against the routes that exist.
 *
 * @module
 */

import type { FamilyId, InventoryId } from './coherence.ts';

/** The section's index, which holds the opening and the grid. */
export const coherence_index_path = '/coherence';

/** Each family's page, where its failures' holds are. */
export const coherence_family_paths = {
	design: '/coherence/design',
	checks: '/coherence/checks',
	claims: '/coherence/claims',
	sessions: '/coherence/sessions'
} as const satisfies Record<FamilyId, string>;

/** Each inventory's page, and the title its table goes by. In the order the section lists them. */
export const coherence_inventory_pages = {
	moved: { path: '/coherence/moved', title: 'Rules that moved down' },
	oracles: { path: '/coherence/oracles', title: 'Oracles in use' },
	actions: { path: '/coherence/actions', title: 'Actions kept with a person' },
	gates: { path: '/coherence/gates', title: 'Gates' }
} as const satisfies Record<InventoryId, { path: string; title: string }>;

export const coherence_inventory_ids = Object.keys(coherence_inventory_pages) as Array<InventoryId>;

/** The page that gathers what the holds leave out. */
export const coherence_gaps_page = {
	path: '/coherence/gaps',
	title: 'What the holds leave out'
} as const;
