<script lang="ts">
	import { resolve } from '$app/paths';

	import { stack_projects } from '#routes/stack_projects.ts';
	import { project_used_by, stack_snapshot } from '#routes/projects/stack_data.ts';
	import {
		dep_edge_is_dev,
		dep_kind_labels,
		dep_kinds,
		snapshot_notes,
		type DepKind,
		type StackDepEdge
	} from '#routes/projects/stack_snapshot.ts';

	// each project with the repos that depend on it, consumers first
	const rows = stack_projects.map((project) => {
		const used_by = project_used_by(project);
		return {
			project,
			runtime: used_by.filter((edge) => !dep_edge_is_dev(edge)),
			dev: used_by.filter(dep_edge_is_dev)
		};
	});

	const of_kind = (edges: Array<StackDepEdge>, kind: DepKind): Array<StackDepEdge> =>
		edges.filter((edge) => edge.kind === kind);
</script>

<svelte:head>
	<title>dependencies - projects - docs.fuz.dev</title>
</svelte:head>

{#snippet consumers(edges: Array<StackDepEdge>)}
	{#each dep_kinds as kind (kind)}
		{@const group = of_kind(edges, kind)}
		{#if group.length > 0}
			<div>
				<small class="text_70">{dep_kind_labels[kind].label}:</small>
				{#each group as edge, index (`${edge.from_repo}|${edge.manifest}`)}
					{#if index > 0},{' '}{/if}<a href={resolve('/projects/[name]', { name: edge.from })}>
						{edge.from_repo}
					</a>{#if edge.manifest === 'cargo'}<small class="text_70">{' '}(crate)</small>{/if}
				{/each}
			</div>
		{/if}
	{/each}
{/snippet}

<div>
	<header>
		<h1>Dependencies between the stack's projects</h1>
		<p class="width_atmost_md">
			Each project with its consumers. {snapshot_notes.consumers} {snapshot_notes.stack_only}
		</p>
		<p class="width_atmost_md">{snapshot_notes.declares} {snapshot_notes.tables}</p>
		<p class="width_atmost_md">
			<small>
				Read from the repos' manifests on
				<time datetime={stack_snapshot.checked}>{stack_snapshot.checked}</time>.
			</small>
		</p>
		<ul class="unstyled row_wrap gap_md mb_lg">
			{#each dep_kinds as kind (kind)}
				<li>
					<small>
						<strong>{dep_kind_labels[kind].label}</strong>
						<span class="text_70">{dep_kind_labels[kind].meaning}</span>
					</small>
				</li>
			{/each}
		</ul>
	</header>
	<div class="overflow-x:auto">
		<table>
			<thead>
				<tr>
					<th scope="col">Project</th>
					<th scope="col">Declared as runtime, peer or optional by</th>
					<th scope="col">Declared as dev or build by</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as { project, runtime, dev } (project.name)}
					<tr>
						<th scope="row" class="text-align:left">
							<a href={resolve('/projects/[name]', { name: project.name })}>{project.name}</a>
						</th>
						<td>
							{#if runtime.length > 0}
								{@render consumers(runtime)}
							{:else}
								<span class="text_70" aria-hidden="true">–</span><span class="sr_only">none</span>
							{/if}
						</td>
						<td>
							{#if dev.length > 0}
								{@render consumers(dev)}
							{:else}
								<span class="text_70" aria-hidden="true">–</span><span class="sr_only">none</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	td,
	th {
		vertical-align: top;
	}
</style>
