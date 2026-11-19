<script lang="ts">
	import { resolve } from '$app/paths';

	import PageSections from '#routes/PageSections.svelte';
	import { CHECK_COMMANDS } from '#routes/projects/check_lines.ts';
	import { project_view } from '#routes/projects/project_views.ts';
	import { repo_class_ids, repo_classes } from '#routes/projects/repo_classes.ts';
	import {
		class_repos,
		repo_file_url,
		stack_actions,
		stack_snapshot
	} from '#routes/projects/stack_data.ts';
	import {
		pin_kinds,
		snapshot_notes,
		trigger_label,
		type StackRepo
	} from '#routes/projects/stack_snapshot.ts';

	const view = project_view('checks');

	const actions = stack_actions();

	const pin_labels: Record<(typeof pin_kinds)[number], string> = {
		commit: 'a commit',
		ref: 'a tag or branch',
		local: "a path in the repo's own tree"
	};

	// how many steps across the stack pin an action each way
	const pin_counts = pin_kinds.map((pin) => ({
		pin,
		steps: actions.reduce((sum, action) => sum + (action.pins[pin] ?? 0), 0)
	}));
</script>

<svelte:head>
	<title>checks - projects - docs.fuz.dev</title>
</svelte:head>

{#snippet repo_link(repo: StackRepo)}
	<a href={resolve('/projects/[name]', { name: repo.project })}>{repo.repo}</a>
{/snippet}

<PageSections sections={view.sections}>
	<header>
		<h1>How each repo is checked</h1>
		<p class="width_atmost_md">
			Every repo of the stack with its check command, what its own docs say of that command, and
			what its CI runs. Each command and comment is the repo's own text, read on
			<time datetime={stack_snapshot.checked}>{stack_snapshot.checked}</time>. This page is computed
			and makes no claim of its own: which command is a repo's gate is said, where it is said, on
			the <a href={resolve('/coherence/gates')}>gates</a> page.
		</p>
		<p class="width_atmost_md"><small>{snapshot_notes.main}</small></p>
	</header>

	<section>
		<h2 id="commands">{view.sections.commands}</h2>
		<p class="width_atmost_md"><small>{snapshot_notes.check_lines}</small></p>
		<div class="overflow-x:auto">
			<table>
				<thead>
					<tr>
						<th scope="col">Repo</th>
						<th scope="col">Its <code>check</code> script</th>
						<th scope="col">How its <code>CLAUDE.md</code> comments it</th>
					</tr>
				</thead>
				<tbody>
					{#each stack_snapshot.repos as repo (repo.repo)}
						<tr>
							<th scope="row" class="text-align:left">{@render repo_link(repo)}</th>
							<td>
								{#if repo.check_script !== null}
									<code class="command">{repo.check_script}</code>
								{:else}
									<small class="text_70">
										{repo.npm ? 'no check script' : 'no package.json'}{repo.cargo
											? ', a Cargo workspace'
											: ''}
									</small>
								{/if}
							</td>
							<td class="said">
								{#if repo.check_lines === null}
									<small class="text_70">no CLAUDE.md</small>
								{:else}
									{#each repo.check_lines as line (line.line)}
										<div>
											<code class="command">{line.command}</code>
											<small>
												{line.comment}
												<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
												<a href={repo_file_url(repo, 'CLAUDE.md', line.line)}>line {line.line}</a>
											</small>
										</div>
									{:else}
										<small class="text_70">
											no line in a code block with {CHECK_COMMANDS.join(' or ')} and a # comment
										</small>
									{/each}
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section>
		<h2 id="classes">{view.sections.classes}</h2>
		<p class="width_atmost_md">
			Classes of repos computed from the snapshot, each with its members. The
			<a href={resolve('/coherence/gates')}>gates</a> page lists some of them under its rows. A repo
			that reaches the same check another way, such as through a script its check script calls, is
			not a member.
		</p>
		<dl class="record-fields">
			{#each repo_class_ids as id (id)}
				{@const members = class_repos(id)}
				<dt>The repos {repo_classes[id].label}</dt>
				<dd>
					{#each members as repo, index (repo.repo)}
						{#if index > 0},{' '}{/if}{@render repo_link(repo)}
					{:else}
						<span class="text_70">none</span>
					{/each}
				</dd>
			{/each}
		</dl>
	</section>

	<section>
		<h2 id="workflows">{view.sections.workflows}</h2>
		<p class="width_atmost_md"><small>{snapshot_notes.commands}</small></p>
		<div class="overflow-x:auto">
			<table>
				<thead>
					<tr>
						<th scope="col">Repo</th>
						<th scope="col">Workflow</th>
						<th scope="col">Runs on</th>
						<th scope="col">Jobs</th>
					</tr>
				</thead>
				<tbody>
					{#each stack_snapshot.repos as repo (repo.repo)}
						{#each repo.workflows as workflow (workflow.file)}
							<tr>
								<th scope="row" class="text-align:left">{@render repo_link(repo)}</th>
								<td>
									<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
									<a href={repo_file_url(repo, `.github/workflows/${workflow.file}`)}>
										{workflow.file}
									</a>
								</td>
								<td>
									{#each workflow.on as trigger (trigger.event)}
										<div><small>{trigger_label(trigger)}</small></div>
									{/each}
								</td>
								<td>
									{#each workflow.jobs as job (job.id)}
										<div>
											<small>
												{job.id}
												<span class="text_70">
													{job.steps.length}
													{job.steps.length === 1 ? 'step' : 'steps'}
												</span>
											</small>
										</div>
									{/each}
								</td>
							</tr>
						{:else}
							<tr>
								<th scope="row" class="text-align:left">{@render repo_link(repo)}</th>
								<td colspan="3"><small class="text_70">no workflow</small></td>
							</tr>
						{/each}
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section>
		<h2 id="actions">{view.sections.actions}</h2>
		<p class="width_atmost_md">
			Each action a step of these workflows uses, and what its steps pin it to.
			{#each pin_counts as { pin, steps }, index (pin)}
				{index === 0 ? 'Across the stack,' : index === pin_counts.length - 1 ? ' and' : ','}
				{steps}
				{steps === 1 ? 'step pins' : 'steps pin'} to {pin_labels[pin]}{#if index ===
					pin_counts.length - 1
				}
					.
				{/if}
			{/each}
			The version an action is pinned at is not recorded, so this table does not change when one is
			upgraded.
		</p>
		<div class="overflow-x:auto">
			<table>
				<thead>
					<tr>
						<th scope="col">Action</th>
						<th scope="col">Pinned to</th>
						<th scope="col">Used by</th>
					</tr>
				</thead>
				<tbody>
					{#each actions as action (action.uses)}
						<tr>
							<th scope="row" class="text-align:left"><code>{action.uses}</code></th>
							<td>
								{#each pin_kinds as pin (pin)}
									{#if action.pins[pin]}
										<div>
											<small>
												{pin_labels[pin]}
												<span class="text_70">
													in {action.pins[pin]}
													{action.pins[pin] === 1 ? 'step' : 'steps'}
												</span>
											</small>
										</div>
									{/if}
								{/each}
							</td>
							<td>
								<small>
									{#each action.repos as repo, index (repo.repo)}
										{#if index > 0},{' '}{/if}{@render repo_link(repo)}
									{/each}
								</small>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
</PageSections>

<style>
	td,
	th {
		vertical-align: top;
	}
	/* a long check script takes the row's width, and what the docs say still needs a line's worth */
	.said {
		min-width: var(--distance_sm);
	}
	/* a command is read whole, so it wraps and never widens its cell */
	.command {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
</style>
