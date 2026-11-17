/**
 * The `/values` page's sections, shared by the page's headings, its sections
 * column, and the sidebar nav on narrow screens.
 *
 * @module
 */

/** A heading's anchor on the page. */
export type ValuesSectionId = 'values' | 'orders' | 'contexts' | 'decisions';

/** Each section's title, in page order. */
export const values_sections: Record<ValuesSectionId, string> = {
	values: 'The values',
	orders: 'Stated orders',
	contexts: 'By context',
	decisions: 'Decisions'
};
