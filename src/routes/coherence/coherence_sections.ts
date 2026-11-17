/**
 * The `/coherence` page's sections, shared by the page's headings, its
 * sections column, and the sidebar nav on narrow screens. An inventory's id
 * is also its section's, so a hold that points at a table links to the
 * heading here.
 *
 * @module
 */

import type { InventoryId } from './coherence.ts';

/** A heading's anchor on the page. */
export type CoherenceSectionId = 'grid' | 'holds' | InventoryId;

/** Each section's title, in page order. */
export const coherence_sections: Record<CoherenceSectionId, string> = {
	grid: 'The grid',
	holds: 'What holds each failure',
	oracles: 'Oracles in use',
	actions: 'Actions kept with a person',
	gates: 'Gates'
};
