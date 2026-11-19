<script lang="ts">
	/**
	 * A family's page: each of its failures, and under each the holds, one
	 * entry per rung that has one.
	 *
	 * @module
	 */

	import { resolve } from '$app/paths';
	import Mdz from '@fuzdev/mdz/Mdz.svelte';

	import PageSections from '#routes/PageSections.svelte';
	import {
		failure_holds,
		failures,
		families,
		family_failures,
		hold_id,
		hold_statuses,
		rungs,
		type FamilyId
	} from './coherence.ts';
	import { coherence_index_path, coherence_inventory_pages } from './coherence_pages.ts';
	import HoldLegend from './HoldLegend.svelte';
	import HoldMark from './HoldMark.svelte';

	const { family }: { family: FamilyId } = $props();

	const family_rows = $derived(family_failures(family));
	const sections = $derived(Object.fromEntries(family_rows.map((f) => [f.id, f.name])));

	const reviewed_count = failures.filter((f) => f.reviewed).length;
	// a row says so itself only while the rows differ, as the index covers the rest
	const review_mixed = reviewed_count > 0 && reviewed_count < failures.length;
</script>

<svelte:head>
	<title>{families[family].label.toLowerCase()} - coherence - docs.fuz.dev</title>
</svelte:head>

<PageSections {sections}>
	<header>
		<h1>{families[family].label}</h1>
		<p class="width_atmost_md">{families[family].summary}</p>
		<p class="width_atmost_md">
			<small>
				Each failure below is a row of <a href={resolve(coherence_index_path)}>the grid</a>, with
				what holds it at each rung.
			</small>
		</p>
		<HoldLegend />
	</header>
	{#each family_rows as failure (failure.id)}
		<section id={failure.id} class="failure pt_lg">
			<h2>{failure.name}</h2>
			<p class="width_atmost_md">
				{failure.summary}
				{#if review_mixed}
					<small class="text_70">
						{failure.reviewed
							? 'Reviewed by the maintainer.'
							: 'Not yet reviewed by the maintainer.'}
					</small>
				{/if}
			</p>
			{#each failure_holds(failure) as { rung, hold } (rung)}
				<article id={hold_id(failure, rung)} class="py_md">
					<h3>{rungs[rung].label}: {hold.label}</h3>
					<dl class="record-fields">
						<dt>{hold.status === 'unreachable' ? 'Status' : 'Coverage'}</dt>
						<dd><HoldMark status={hold.status} /> {hold_statuses[hold.status].label}</dd>
						{#if hold.status === 'unreachable'}
							<dt>Why</dt>
							<dd>{hold.why}</dd>
						{:else}
							<dt>Does</dt>
							<dd>{hold.does}</dd>
							{#if hold.gap}
								<dt>Leaves out</dt>
								<dd>{hold.gap}</dd>
							{/if}
							{#if hold.fails}
								<dt>Fails</dt>
								<dd>{hold.fails}</dd>
							{/if}
							{#if hold.cost}
								<dt>Cost</dt>
								<dd>{hold.cost}</dd>
							{/if}
							{#if hold.wanted}
								<dt>Wanted</dt>
								<dd><HoldMark status="wanted" /> {hold.wanted}</dd>
							{/if}
							<dt>Evidence</dt>
							<dd>
								<ul class="unstyled">
									{#each hold.evidence as evidence (evidence)}
										<li><Mdz content={evidence} inline /></li>
									{/each}
								</ul>
							</dd>
							{#if hold.inventories}
								<dt>Listed</dt>
								<dd>
									<ul class="unstyled">
										{#each hold.inventories as inventory (inventory)}
											<li>
												<a href={resolve(coherence_inventory_pages[inventory].path)}>
													{coherence_inventory_pages[inventory].title}
												</a>
											</li>
										{/each}
									</ul>
								</dd>
							{/if}
						{/if}
					</dl>
				</article>
			{/each}
		</section>
	{/each}
</PageSections>

<style>
	.failure {
		border-top: var(--border_width) solid var(--border_color);
	}
</style>
