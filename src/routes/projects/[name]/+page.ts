import { error } from '@sveltejs/kit';

import { project_lenses_with_records } from '#routes/projects/project_lens.ts';

/** A page for each project the data names. */
export const entries = (): Array<{ name: string }> =>
	project_lenses_with_records.map((lens) => ({ name: lens.project.name }));

/** A name with no page is not found, so a link to one fails the build that prerenders it. */
export const load = ({ params }: { params: { name: string } }): { name: string } => {
	if (!project_lenses_with_records.some((lens) => lens.project.name === params.name)) {
		error(404, `the site's data names no project "${params.name}"`);
	}
	return { name: params.name };
};
