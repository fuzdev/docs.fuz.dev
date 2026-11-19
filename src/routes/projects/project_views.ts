/**
 * The pages of the projects section that look across the whole stack, as
 * each project's page looks at one. The sidebar and the section's index list
 * them from here.
 *
 * @module
 */

/** One stack-wide page: its title, route, one-line summary, and sections by anchor. */
export interface ProjectView {
	title: string;
	path: string;
	summary: string;
	sections: Record<string, string>;
}

export const project_views = [
	{
		title: 'Dependencies',
		path: '/projects/dependencies',
		summary: 'each project with its consumers',
		sections: {}
	},
	{
		title: 'Checks',
		path: '/projects/checks',
		summary: "each repo's check command, what its docs say of it, and its CI",
		sections: {
			commands: 'Check commands',
			classes: 'Classes of repos',
			workflows: 'CI workflows',
			actions: 'Actions the workflows use'
		}
	},
	{
		title: 'Third-party code',
		path: '/projects/third-party',
		summary: 'what each repo declares from outside the stack',
		sections: { packages: 'By package', repos: 'By repo' }
	}
] as const satisfies ReadonlyArray<ProjectView>;

/** A stack-wide page by the last part of its route. */
export const project_view = (slug: 'dependencies' | 'checks' | 'third-party'): ProjectView =>
	project_views.find((view) => view.path === `/projects/${slug}`)!;
