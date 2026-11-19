<script lang="ts">
	import { resolve } from '$app/paths';

	import PageSections from '#routes/PageSections.svelte';
	import { project_view } from '#routes/projects/project_views.ts';
	import { stack_snapshot, stack_third_party } from '#routes/projects/stack_data.ts';
	import {
		dep_kind_labels,
		dep_kinds,
		snapshot_notes,
		type StackRepo
	} from '#routes/projects/stack_snapshot.ts';

	const view = project_view('third-party');

	const uses = stack_third_party();

	// the repos that declare nothing from outside the stack, outside their dev tables
	const without = stack_snapshot.repos.filter((repo) => repo.third_party.length === 0);
	const declaring = stack_snapshot.repos.filter((repo) => repo.third_party.length > 0);
</script>

<svelte:head>
	<title>third-party code - projects - docs.fuz.dev</title>
</svelte:head>

{#snippet repo_link(repo: StackRepo)}
	<a href={resolve('/projects/[name]', { name: repo.project })}>{repo.repo}</a>
{/snippet}

<PageSections sections={view.sections}>
	<header>
		<h1>What the stack declares from outside itself</h1>
		<p class="width_atmost_md">
			Every package and crate that a stack repo's manifests declare outside their dev tables and
			that is no stack project's, read on
			<time datetime={stack_snapshot.checked}>{stack_snapshot.checked}</time>. This page is computed
			and makes no claim of its own.
		</p>
		<p class="width_atmost_md">{snapshot_notes.third_party}</p>
		<p class="width_atmost_md"><small>{snapshot_notes.tables} {snapshot_notes.main}</small></p>
		<ul class="unstyled row_wrap gap_md">
			{#each dep_kinds.filter((kind) => kind !== 'dev') as kind (kind)}
				<li>
					<small>
						<strong>{dep_kind_labels[kind].label}</strong>
						<span class="text_70">{dep_kind_labels[kind].meaning}</span>
					</small>
				</li>
			{/each}
		</ul>
	</header>

	<section>
		<h2 id="packages">{view.sections.packages}</h2>
		<p class="width_atmost_md">The most declared first.</p>
		<div class="overflow-x:auto">
			<table>
				<thead>
					<tr>
						<th scope="col">Name</th>
						<th scope="col">From</th>
						<th scope="col">Declared by</th>
					</tr>
				</thead>
				<tbody>
					{#each uses as use (`${use.manifest}|${use.name}`)}
						<tr>
							<th scope="row" class="text-align:left"><code>{use.name}</code></th>
							<td><small>{use.manifest === 'npm' ? 'npm' : 'crates'}</small></td>
							<td>
								{#each dep_kinds as kind (kind)}
									{@const group = use.repos.filter((r) => r.kind === kind)}
									{#if group.length > 0}
										<div>
											<small class="text_70">{dep_kind_labels[kind].label}:</small>
											{#each group as { repo }, index (repo.repo)}
												{#if index > 0},{' '}{/if}{@render repo_link(repo)}
											{/each}
										</div>
									{/if}
								{/each}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section>
		<h2 id="repos">{view.sections.repos}</h2>
		{#if without.length > 0}
			<p class="width_atmost_md">
				<span class="text_70">
					Declaring nothing from outside the stack, outside the dev tables:
				</span>
				{#each without as repo, index (repo.repo)}
					{#if index > 0},{' '}{/if}{@render repo_link(repo)}
				{/each}.
			</p>
		{/if}
		<dl class="record-fields">
			{#each declaring as repo (repo.repo)}
				<dt>{@render repo_link(repo)}</dt>
				<dd>
					{#each dep_kinds as kind (kind)}
						{@const group = repo.third_party.filter((dep) => dep.kind === kind)}
						{#if group.length > 0}
							<div>
								<small class="text_70">{dep_kind_labels[kind].label}:</small>
								<small>{group.map((dep) => dep.name).join(', ')}</small>
							</div>
						{/if}
					{/each}
				</dd>
			{/each}
		</dl>
	</section>
</PageSections>

<style>
	td,
	th {
		vertical-align: top;
	}
</style>
