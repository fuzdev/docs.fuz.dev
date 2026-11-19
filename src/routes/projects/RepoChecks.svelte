<script lang="ts">
	/**
	 * What the snapshot holds of how one repo is checked: its check script, how
	 * its `CLAUDE.md` comments that command, the classes it is in, and its CI
	 * workflows job by job. Everything is the repo's own text, quoted.
	 *
	 * @module
	 */

	import { CHECK_COMMANDS } from './check_lines.ts';
	import { repo_classes } from './repo_classes.ts';
	import { repo_class_ids_of, repo_file_url } from './stack_data.ts';
	import { trigger_label, type StackRepo } from './stack_snapshot.ts';
	import { step_blocks } from './workflow_read.ts';

	const { repo }: { repo: StackRepo } = $props();

	const class_ids = $derived(repo_class_ids_of(repo));
</script>

{#if repo.check_script !== null}
	<p class="width_atmost_md">
		The <code>check</code> script of its <code>package.json</code>:
	</p>
	<pre class="commands">{repo.check_script}</pre>
{:else}
	<p class="width_atmost_md">
		{repo.npm ? 'Its package.json has no check script.' : 'It has no package.json.'}
		{repo.cargo ? 'It has a Cargo workspace at its root.' : ''}
	</p>
{/if}

{#if repo.check_lines === null}
	<p class="width_atmost_md">It has no <code>CLAUDE.md</code> at its root.</p>
{:else if repo.check_lines.length === 0}
	<p class="width_atmost_md">
		Its <code>CLAUDE.md</code> has no line in a code block that gives
		{#each CHECK_COMMANDS as command, index (command)}
			{#if index > 0}{' '}or{' '}{/if}<code>{command}</code>
		{/each} with a <code>#</code> comment, and none whose comment says to run it before committing.
		It may describe its checks another way.
	</p>
{:else}
	<p class="width_atmost_md">How its <code>CLAUDE.md</code> comments its check command:</p>
	<ul class="unstyled">
		{#each repo.check_lines as line (line.line)}
			<li class="mb_sm">
				<pre class="commands">{line.command}  # {line.comment}</pre>
				<small>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href={repo_file_url(repo, 'CLAUDE.md', line.line)}>line {line.line}</a
					>{#if line.before_committing}, marked as the command to run before committing{/if}
				</small>
			</li>
		{/each}
	</ul>
{/if}

{#if class_ids.length > 0}
	<p class="width_atmost_md">
		<span class="text_70">It is among the repos</span>
		{#each class_ids as id, index (id)}
			{#if index > 0}<span class="text_70">;</span>{' '}{/if}{repo_classes[id].label}
		{/each}.
	</p>
{/if}

{#each repo.workflows as workflow (workflow.file)}
	<details>
		<summary>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a href={repo_file_url(repo, `.github/workflows/${workflow.file}`)}>
				<code>.github/workflows/{workflow.file}</code>
			</a>
			<small class="text_70">runs on {workflow.on.map(trigger_label).join(', ')}</small>
		</summary>
		{#each workflow.jobs as job (job.id)}
			<h4>
				{job.id}
				<small class="text_70">
					on {job.runs_on}{#if job.if}, if <code>{job.if}</code>{/if}
				</small>
			</h4>
			<ol>
				{#each job.steps as step, index (index)}
					<li>
						{#if step.name}<small class="text_70">{step.name}</small>{/if}
						{#if step.if}<small class="text_70">if <code>{step.if}</code></small>{/if}
						{#if !step_blocks(step)}
							<small class="text_70">may fail without failing the job</small>
						{/if}
						{#if step.run !== undefined}
							<pre class="commands">{step.run}</pre>
						{:else}
							<div>
								<small>
									uses <code>{step.uses}</code
									>{#if step.pin === 'commit'}
										, pinned to a commit
									{:else if step.pin === 'ref'}
										, at a tag or branch
									{/if}
								</small>
							</div>
						{/if}
					</li>
				{/each}
			</ol>
		{/each}
	</details>
{:else}
	<p class="width_atmost_md">It has no CI workflow.</p>
{/each}

<style>
	/* a command is read whole, so it wraps and never scrolls sideways */
	.commands {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
</style>
