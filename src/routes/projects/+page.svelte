<script lang="ts">
	import { resolve } from '$app/paths';

	import { project_pages } from './project_page.ts';
	import { dep_edge_projects } from './stack_snapshot.ts';

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
			is, see the <a href="https://www.fuz.dev/stack">Fuz stack page</a>.
		</p>
		<p class="width_atmost_md">
			All of the stack's <a href={resolve('/projects/dependencies')}>dependencies</a> are on one
			page.
		</p>
	</header>
	<ul class="unstyled">
		{#each project_pages as { project, used_by, uses, lens } (project.name)}
			<li class="mb_sm">
				<a href={resolve('/projects/[name]', { name: project.name })}>{project.name}</a>
				<span class="text_70">
					—
					{parts([
						[dep_edge_projects(used_by, 'from').length, 'consumer', 'consumers'],
						[dep_edge_projects(uses, 'to').length, 'dependency', 'dependencies'],
						[lens.failures.length + lens.holds.length, 'hold', 'holds'],
						[lens.comparisons.length, 'comparison', 'comparisons'],
						[lens.gates.length + lens.gate_gaps.length, 'gate entry', 'gate entries']
					])}
				</span>
			</li>
		{/each}
	</ul>
</div>
