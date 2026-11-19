<script lang="ts">
	import { resolve } from '$app/paths';

	import { project_pages } from './project_page.ts';
	import { project_views } from './project_views.ts';
	import ProjectFacets from './ProjectFacets.svelte';
	import { stack_facets } from './stack_data.ts';
	import { dep_edge_projects } from './stack_snapshot.ts';

	// the projects of each layer, in the stack page's order, and last any it does not file
	const groups = [
		...stack_facets.layers.map((layer) => ({
			layer,
			pages: project_pages.filter((page) => page.facets?.layer === layer)
		})),
		{ layer: 'not on the stack page', pages: project_pages.filter((page) => !page.facets) }
	].filter((group) => group.pages.length > 0);

	// what a page holds, as a few words, leaving out what it has none of
	const parts = (counts: Array<[number, string, string]>): string =>
		counts
			.filter(([count]) => count > 0)
			.map(([count, one, many]) => `${count} ${count === 1 ? one : many}`)
			.join(', ');
</script>

<svelte:head>
	<title>projects - docs.fuz.dev</title>
</svelte:head>

<div>
	<header>
		<h1>Projects</h1>
		<p class="width_atmost_md">
			Each project of the stack as this site sees it: what its repo's own files declare (what it
			depends on, what depends on it, its check script and CI), and every record on the
			<a href={resolve('/coherence')}>coherence</a> and <a href={resolve('/values')}>values</a>
			pages that names it. Each page is computed and adds nothing of its own. For what each project
			is, see the <a href="https://www.fuz.dev/stack">Fuz stack page</a>, whose layers, statuses and
			languages these are, read on
			<time datetime={stack_facets.checked}>{stack_facets.checked}</time>.
		</p>
		<p class="width_atmost_md">Across the whole stack:</p>
		<ul>
			{#each project_views as view (view.path)}
				<li><a href={resolve(view.path)}>{view.title}</a>: {view.summary}</li>
			{/each}
		</ul>
	</header>
	{#each groups as group (group.layer)}
		<section>
			<h2>{group.layer}</h2>
			<ul class="unstyled">
				{#each group.pages as { project, facets, used_by, uses, lens } (project.name)}
					<li class="mb_sm">
						<a href={resolve('/projects/[name]', { name: project.name })}>{project.name}</a>
						{#if facets}<ProjectFacets {facets} />{/if}
						<div>
							<small class="text_70">
								{parts([
									[dep_edge_projects(used_by, 'from').length, 'consumer', 'consumers'],
									[dep_edge_projects(uses, 'to').length, 'dependency', 'dependencies'],
									[lens.failures.length + lens.holds.length, 'hold', 'holds'],
									[lens.comparisons.length, 'comparison', 'comparisons'],
									[lens.gates.length + lens.gate_gaps.length, 'gate entry', 'gate entries']
								])}
							</small>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
	<ul class="unstyled row_wrap gap_md">
		{#each stack_facets.statuses as status (status.id)}
			<li>
				<small>
					<strong>{status.label}</strong>
					<span class="text_70">{status.description}</span>
				</small>
			</li>
		{/each}
	</ul>
</div>
