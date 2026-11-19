/**
 * What a project's page shows: what the snapshot of its repos says, and the
 * project's lens over the data pages. Every project of the stack has a page,
 * since every one has a repo the snapshot reads.
 *
 * @module
 */

import { stack_projects, type StackProject } from '#routes/stack_projects.ts';
import { project_lens, project_lens_sections, type ProjectLens } from './project_lens.ts';
import { project_repos, project_used_by, project_uses } from './stack_data.ts';
import type { StackDepEdge, StackRepo } from './stack_snapshot.ts';

/** Everything one project's page renders. */
export interface ProjectPage {
	project: StackProject;
	/** The stack repos that declare a dependency on it, strongest kind first. */
	used_by: Array<StackDepEdge>;
	/** What its repos declare a dependency on, strongest kind first. */
	uses: Array<StackDepEdge>;
	repos: Array<StackRepo>;
	lens: ProjectLens;
	/** Each section's title by its anchor, in page order, leaving out an empty one. */
	sections: Record<string, string>;
}

/** Builds a project's page from the snapshot and the data pages. */
export const project_page = (project: StackProject): ProjectPage => {
	const used_by = project_used_by(project);
	const uses = project_uses(project);
	const repos = project_repos(project);
	const lens = project_lens(project);
	const sections: Record<string, string> = {};
	if (used_by.length > 0) sections.used_by = 'What uses it';
	if (uses.length > 0) sections.uses = 'What it uses';
	if (repos.length > 0) sections.commands = 'Its check script and CI';
	Object.assign(sections, project_lens_sections(lens));
	return { project, used_by, uses, repos, lens, sections };
};

/** Every project's page, in the stack page's order. */
export const project_pages: Array<ProjectPage> = stack_projects.map(project_page);
