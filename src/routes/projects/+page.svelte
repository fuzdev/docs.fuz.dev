<script lang="ts">
	import { resolve } from '$app/paths';

	import {
		project_lenses,
		project_lenses_with_records,
		project_lens_size
	} from './project_lens.ts';

	const unnamed = project_lenses.filter((lens) => project_lens_size(lens) === 0);

	// what a lens holds, as a few words, leaving out what it has none of
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
			Each project of the stack, seen through this site's data: the holds that name it on the
			<a href={resolve('/coherence')}>coherence</a> pages, what it is compared against, its gates,
			and the priorities it states on the <a href={resolve('/values')}>values</a> page. Each page is
			computed from those records and adds nothing to them. For what each project is, see the
			<a href="https://www.fuz.dev/stack">Fuz stack page</a>.
		</p>
	</header>
	<ul class="unstyled">
		{#each project_lenses_with_records as lens (lens.project.name)}
			<li class="mb_sm">
				<a href={resolve('/projects/[name]', { name: lens.project.name })}>{lens.project.name}</a>
				<span class="text_70">
					—
					{parts([
						[lens.failures.length + lens.holds.length, 'hold', 'holds'],
						[lens.comparisons.length, 'comparison', 'comparisons'],
						[lens.gates.length + lens.gate_gaps.length, 'gate entry', 'gate entries'],
						[lens.kept_actions.length, 'kept action', 'kept actions'],
						[lens.moved_rules.length, 'moved rule', 'moved rules'],
						[
							lens.stated_orders.length +
								lens.decisions.length +
								lens.passes.length +
								lens.shortfalls.length +
								lens.contexts.length +
								lens.passage_evidence.length,
							'values entry',
							'values entries'
						]
					])}
				</span>
			</li>
		{/each}
	</ul>
	{#if unnamed.length > 0}
		<p class="width_atmost_md">
			<small>
				The data pages do not yet name {unnamed.map((lens) => lens.project.name).join(', ')}.
			</small>
		</p>
	{/if}
</div>
