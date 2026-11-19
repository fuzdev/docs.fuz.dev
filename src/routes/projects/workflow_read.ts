/**
 * Reads a GitHub Actions workflow file into what the snapshot keeps of it:
 * what triggers it, and each job's steps in file order. Pure, so its rules
 * can be tested without a checkout.
 *
 * It keeps a step's command or the action it uses, its name, its condition
 * and whether it may fail without failing its job, and a job's runner and
 * condition. It leaves out everything else: permissions, environment,
 * working directories, a matrix's values, an action's inputs and the inputs
 * of a manual run. A workflow it cannot read whole is an error.
 *
 * @module
 */

import type { StackJob, StackStep, StackTrigger, StackWorkflow } from './stack_snapshot.ts';
import { yaml_subset_parse, type YamlValue } from './yaml_subset.ts';

type YamlMap = Map<string, YamlValue>;

const is_map = (value: YamlValue | undefined): value is YamlMap => value instanceof Map;

const to_strings = (value: YamlValue | undefined, what: string): Array<string> => {
	if (typeof value === 'string') return [value];
	if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value;
	throw new Error(`${what} is not a string or a list of strings`);
};

/** The filters of a trigger this keeps, each a list of patterns. */
const TRIGGER_FILTERS = ['branches', 'tags', 'paths'] as const;

const read_trigger = (event: string, value: YamlValue): StackTrigger => {
	const trigger: StackTrigger = { event };
	if (value === null) return trigger;
	if (event === 'schedule') {
		if (!Array.isArray(value)) throw new Error('a schedule that is not a list');
		trigger.cron = value.map((item) => {
			const cron = is_map(item) ? item.get('cron') : undefined;
			if (typeof cron !== 'string' || !is_map(item) || item.size !== 1) {
				throw new Error('a schedule entry that is not one cron');
			}
			return cron;
		});
		return trigger;
	}
	if (!is_map(value)) throw new Error(`the ${event} trigger is not a mapping`);
	for (const [key, filter] of value) {
		// what a manual run asks for is not a condition on when the workflow runs
		if (event === 'workflow_dispatch' && key === 'inputs') continue;
		if (!TRIGGER_FILTERS.some((name) => name === key)) {
			throw new Error(`the ${event} trigger has a key this does not read: ${key}`);
		}
		trigger[key as (typeof TRIGGER_FILTERS)[number]] = to_strings(filter, `${event}.${key}`);
	}
	return trigger;
};

/** Reads the `on` key, in any of the three forms it is written in. */
const read_triggers = (on: YamlValue | undefined): Array<StackTrigger> => {
	if (typeof on === 'string') return [{ event: on }];
	if (Array.isArray(on)) return to_strings(on, 'on').map((event) => ({ event }));
	if (is_map(on)) return Array.from(on, ([event, value]) => read_trigger(event, value));
	throw new Error('no `on` key this can read');
};

/**
 * Splits a step's `uses` into the action and how it is pinned. The ref itself is not
 * kept, so the snapshot does not change when an action is upgraded.
 */
const read_uses = (uses: string): Pick<StackStep, 'uses' | 'pin'> => {
	if (uses.startsWith('./')) return { uses, pin: 'local' };
	const at = uses.lastIndexOf('@');
	if (at <= 0) throw new Error(`an action with no ref: ${uses}`);
	return {
		uses: uses.slice(0, at),
		pin: /^[0-9a-f]{40}$/.test(uses.slice(at + 1)) ? 'commit' : 'ref'
	};
};

const read_step = (value: YamlValue): StackStep => {
	if (!is_map(value)) throw new Error('a step that is not a mapping');
	const step: StackStep = {};
	const name = value.get('name');
	const condition = value.get('if');
	const run = value.get('run');
	const uses = value.get('uses');
	if (typeof name === 'string') step.name = name;
	if (typeof condition === 'string') step.if = condition;
	const continues = value.get('continue-on-error');
	if (typeof continues === 'string') step.continue_on_error = continues;
	else if (continues !== undefined) throw new Error('a continue-on-error this cannot read');
	if (typeof run === 'string' && uses === undefined) {
		step.run = run;
	} else if (typeof uses === 'string' && run === undefined) {
		Object.assign(step, read_uses(uses));
	} else {
		throw new Error(
			`a step that is neither one command nor one action: ${step.name ?? '(unnamed)'}`
		);
	}
	return step;
};

const read_job = (id: string, value: YamlValue): StackJob => {
	if (!is_map(value)) throw new Error(`the job ${id} is not a mapping`);
	const steps = value.get('steps');
	// a job that calls another workflow has no steps of its own to read
	if (!Array.isArray(steps)) throw new Error(`the job ${id} has no steps`);
	const job: StackJob = {
		id,
		runs_on: to_strings(value.get('runs-on'), `${id}.runs-on`).join(', '),
		steps: steps.map(read_step)
	};
	const condition = value.get('if');
	if (typeof condition === 'string') job.if = condition;
	return job;
};

/**
 * Reads one workflow file.
 *
 * @throws Error for YAML outside the subset `yaml_subset_parse` reads, a trigger with a
 * filter this does not know, a job without steps, or a step that is not one command or
 * one action
 */
export const workflow_read = (yaml: string): Omit<StackWorkflow, 'file'> => {
	const doc = yaml_subset_parse(yaml);
	if (!is_map(doc)) throw new Error('a workflow that is not a mapping');
	const jobs = doc.get('jobs');
	if (!is_map(jobs)) throw new Error('no `jobs` key this can read');
	return {
		on: read_triggers(doc.get('on')),
		jobs: Array.from(jobs, ([id, value]) => read_job(id, value))
	};
};

/**
 * Whether a step's failure fails its job. A step that continues on error runs a command
 * without holding anything to it, and one whose setting is an expression may.
 */
export const step_blocks = (step: StackStep): boolean =>
	step.continue_on_error === undefined || step.continue_on_error === 'false';

/**
 * Every command a workflow's steps run and are held to, in file order across its jobs:
 * a step that may fail without failing its job is left out.
 */
export const workflow_commands = (workflow: Pick<StackWorkflow, 'jobs'>): Array<string> =>
	workflow.jobs.flatMap((job) =>
		job.steps.flatMap((step) => (step.run === undefined || !step_blocks(step) ? [] : [step.run]))
	);
