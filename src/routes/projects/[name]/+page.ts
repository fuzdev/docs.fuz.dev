import { error } from '@sveltejs/kit';

import { stack_projects } from '#routes/stack_projects.ts';

/** A page for each project of the stack. */
export const entries = (): Array<{ name: string }> =>
	stack_projects.map((project) => ({ name: project.name }));

/** A name off the list is not found, so a link to one fails the build that prerenders it. */
export const load = ({ params }: { params: { name: string } }): { name: string } => {
	if (!stack_projects.some((project) => project.name === params.name)) {
		error(404, `the stack has no project "${params.name}"`);
	}
	return { name: params.name };
};
