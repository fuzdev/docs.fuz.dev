import { basename, dirname } from 'node:path';
import { fs } from '@fuzdev/gro/fs.ts';
import type { Task } from '@fuzdev/gro/task.ts';
import { TaskError } from '@fuzdev/gro/task_error.ts';
import * as s from '@fuzdev/fuz_schema/schema.ts';

import { coherence_entries } from './coherence/coherence.ts';
import { glossary_entries } from './glossary/glossary.ts';
import { STACK_OWNER, stack_projects } from './stack_projects.ts';
import { values_entries } from './values/values.ts';
import {
	entries_to_links,
	evidence_check,
	evidence_verdict_fails,
	links_outside_repos,
	stack_page_project_names,
	stack_page_project_repos,
	stack_page_repo_names
} from './evidence.ts';

/** @nodocs */
export const Args = s.object({});
export type Args = s.Infer<typeof Args>;

/** Where the Fuz stack page lists the projects it announces, in the fuz.dev checkout. */
const STACK_PAGE_DATA = 'fuz.dev/src/routes/stack/stack.ts';

/**
 * Run as `gro task src/routes/evidence_check.task.ts`, with the repos the pages cite
 * checked out beside this one. Covers the `/coherence` and `/values` pages.
 *
 * @nodocs
 */
export const task: Task<Args> = {
	summary: 'check that the coherence and values pages cite files that exist, in stack repos',
	Args,
	run: async ({ log }) => {
		const repos_dir = await fs.open_dir(dirname(fs.project.path));
		const links = entries_to_links([
			...coherence_entries(),
			...values_entries(),
			...glossary_entries()
		]);
		const results = await evidence_check(links, {
			repos_dir,
			site_repo: basename(fs.project.path)
		});

		const failed = results.filter((r) => evidence_verdict_fails(r.verdict));
		const unchecked = results.filter((r) => r.verdict === 'unchecked');
		for (const r of unchecked) log.warn(`unchecked: ${r.reference} (${r.record})`);
		for (const r of failed) log.error(`${r.verdict}: ${r.reference} (${r.record})`);
		log.info(
			`${results.length - failed.length - unchecked.length} links resolve, ` +
				`${unchecked.length} cannot be checked from disk, ${failed.length} fail`
		);

		// both pages may cite only what the stack page announces: every link names one of
		// its repos, and this site's list of projects is the stack page's
		const stack_page = await repos_dir.read_text_if_exists(STACK_PAGE_DATA);
		if (stack_page === null) throw new TaskError(`cannot read ${STACK_PAGE_DATA}`);
		const announced_repos = stack_page_repo_names(stack_page);
		if (announced_repos.size === 0) throw new TaskError(`no repos read from ${STACK_PAGE_DATA}`);
		const outside = links_outside_repos(links, STACK_OWNER, announced_repos);
		for (const l of outside) log.error(`not a stack repo: ${l.reference} (${l.record})`);
		// this site's own list of projects is the stack page's: the same names in the same
		// order, each with that project's repo first and no repo the page does not name
		const announced = stack_page_project_names(stack_page);
		const page_repos = stack_page_project_repos(stack_page);
		const unannounced: Array<string> = [];
		const listed: Array<string> = stack_projects.map((p) => p.name);
		for (const name of announced) {
			if (!listed.includes(name)) unannounced.push(`${name} is on the stack page and not listed`);
		}
		if (unannounced.length === 0 && listed.join() !== [...announced].join()) {
			unannounced.push("the list is not in the stack page's order");
		}
		for (const project of stack_projects) {
			if (!announced.has(project.name)) {
				unannounced.push(`${project.name} is not on the stack page`);
			} else if (page_repos.get(project.name) !== project.repos[0]) {
				unannounced.push(
					`${project.name}'s repo is ${page_repos.get(project.name)}, not ${project.repos[0]}`
				);
			}
			for (const repo of project.repos) {
				if (!announced_repos.has(repo))
					unannounced.push(`${project.name}: ${repo} is no stack repo`);
			}
		}
		for (const message of unannounced) log.error(message);

		if (failed.length > 0 || outside.length > 0 || unannounced.length > 0) {
			throw new TaskError(
				`${failed.length} evidence links do not resolve, ` +
					`${outside.length} name a repo off the stack page, ` +
					`${unannounced.length} entries of the project list are off it`
			);
		}
	}
};
