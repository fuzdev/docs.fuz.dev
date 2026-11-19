/**
 * What a project's page shows: how the stack page files it, what the snapshot
 * of its repos says, and the project's lens over the data pages. Every
 * project of the stack has a page, since every one has a repo the snapshot
 * reads.
 *
 * @module
 */

import { gates, type Gate } from '#routes/coherence/coherence.ts';
import { stack_projects, type StackProject } from '#routes/stack_projects.ts';
import { project_lens, project_lens_sections, type ProjectLens } from './project_lens.ts';
import { repo_classes } from './repo_classes.ts';
import { project_facets, project_repos, project_used_by, project_uses } from './stack_data.ts';
import type { StackProjectFacets } from './stack_facets.ts';
import type { StackDepEdge, StackRepo } from './stack_snapshot.ts';

/** Everything one project's page renders. */
export interface ProjectPage {
	project: StackProject;
	/** How the stack page files it. */
	facets: StackProjectFacets | undefined;
	/** The stack repos that declare a dependency on it, strongest kind first. */
	used_by: Array<StackDepEdge>;
	/** What its repos declare a dependency on, strongest kind first. */
	uses: Array<StackDepEdge>;
	repos: Array<StackRepo>;
	/**
	 * The gates whose row speaks of a class of repos that one of its repos is in, and
	 * that the lens does not already hold for naming the project.
	 */
	class_gates: Array<{ gate: Gate; repos: Array<StackRepo> }>;
	lens: ProjectLens;
	/** Each section's title by its anchor, in page order, leaving out an empty one. */
	sections: Record<string, string>;
}

/** The anchors of a project page's sections, in page order. */
const PROJECT_SECTIONS = [
	'used_by',
	'uses',
	'third_party',
	'commands',
	'opening',
	'holds',
	'oracles',
	'gates',
	'actions',
	'moved',
	'values'
] as const;

/** Builds a project's page from the snapshot and the data pages. */
export const project_page = (project: StackProject): ProjectPage => {
	const used_by = project_used_by(project);
	const uses = project_uses(project);
	const repos = project_repos(project);
	const lens = project_lens(project);
	const class_gates = gates.flatMap((gate) => {
		if (gate.where_class === undefined || lens.gates.includes(gate)) return [];
		const members = repos.filter(repo_classes[gate.where_class].has);
		return members.length > 0 ? [{ gate, repos: members }] : [];
	});
	const titles: Record<string, string> = project_lens_sections(lens);
	if (used_by.length > 0) titles.used_by = 'What uses it';
	if (uses.length > 0) titles.uses = 'What it uses';
	if (repos.some((repo) => repo.third_party.length > 0)) {
		titles.third_party = 'What it declares from outside the stack';
	}
	if (repos.length > 0) titles.commands = 'Its check script and CI';
	if (class_gates.length > 0) titles.gates = 'Gates';
	const sections: Record<string, string> = {};
	for (const id of PROJECT_SECTIONS) {
		if (titles[id] !== undefined) sections[id] = titles[id];
	}
	return {
		project,
		facets: project_facets(project),
		used_by,
		uses,
		repos,
		class_gates,
		lens,
		sections
	};
};

/** Every project's page, in the stack page's order. */
export const project_pages: Array<ProjectPage> = stack_projects.map(project_page);
