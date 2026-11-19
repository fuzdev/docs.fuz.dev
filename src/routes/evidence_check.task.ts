import { basename, dirname } from 'node:path';
import { fs } from '@fuzdev/gro/fs.ts';
import type { Task } from '@fuzdev/gro/task.ts';
import { TaskError } from '@fuzdev/gro/task_error.ts';
import * as s from '@fuzdev/fuz_schema/schema.ts';

import { coherence_entries } from './coherence/coherence.ts';
import { stack_projects, values_entries } from './values/values.ts';
import {
	entries_to_links,
	evidence_check,
	evidence_verdict_fails,
	stack_page_project_names
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
	summary: 'check that the coherence and values pages cite files and projects that exist',
	Args,
	run: async ({ log }) => {
		const repos_dir = await fs.open_dir(dirname(fs.project.path));
		const links = entries_to_links([...coherence_entries(), ...values_entries()]);
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

		// the values page may name only what the stack page announces
		const stack_page = await repos_dir.read_text_if_exists(STACK_PAGE_DATA);
		if (stack_page === null) throw new TaskError(`cannot read ${STACK_PAGE_DATA}`);
		const announced = stack_page_project_names(stack_page);
		const unannounced = stack_projects.filter((name) => !announced.has(name));
		for (const name of unannounced) log.error(`not on the stack page: ${name}`);

		if (failed.length > 0 || unannounced.length > 0) {
			throw new TaskError(
				`${failed.length} evidence links do not resolve, ` +
					`${unannounced.length} projects are not announced`
			);
		}
	}
};
