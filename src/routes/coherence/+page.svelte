<script lang="ts">
	import { resolve } from '$app/paths';
	import { site_context } from '@fuzdev/fuz_ui/site.svelte.ts';

	import {
		claims_checked,
		failures,
		families,
		family_failures,
		family_ids,
		hold_id,
		hold_statuses,
		intro,
		passages,
		rung_ids,
		rungs,
		written_by
	} from './coherence.ts';
	import {
		coherence_family_paths,
		coherence_inventory_ids,
		coherence_inventory_pages
	} from './coherence_pages.ts';
	import HoldLegend from './HoldLegend.svelte';
	import HoldMark from './HoldMark.svelte';

	const site = site_context.get();

	const reviewed_count = failures.filter((f) => f.reviewed).length;
	const review_state =
		reviewed_count === 0
			? 'has not yet reviewed it'
			: reviewed_count === failures.length
				? 'has reviewed every failure row'
				: `has reviewed ${reviewed_count} of its ${failures.length} failure rows`;
</script>

<svelte:head>
	<title>keeping software coherent at agent speed - docs.fuz.dev</title>
</svelte:head>

<div>
	<header>
		<h1>Keeping software coherent at agent speed</h1>
		{#each intro as paragraph (paragraph)}
			<p class="width_atmost_md">{paragraph}</p>
		{/each}
		<p class="width_atmost_md">
			The projects named are the ones on the <a href="https://www.fuz.dev/stack">Fuz stack page</a>.
			See also the <a href={resolve('/skills')}>skills</a> the written rung cites, and the
			<a href={resolve('/values')}>values</a> the stack's design is measured against.
		</p>
		<p class="width_atmost_md">
			<small>
				{written_by} wrote this section and its
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href="{site.repo_url}/blob/main/src/routes/coherence/coherence.ts">data file</a>. Its
				claims were checked against the repos on
				<time datetime={claims_checked}>{claims_checked}</time>. The maintainer {review_state}.
			</small>
		</p>
	</header>

	<section>
		<h2 id="grid">The grid</h2>
		<p class="width_atmost_md">{passages.grid}</p>
		<HoldLegend />
		<div class="grid-box">
			<table class="failure-grid">
				<thead>
					<tr>
						<th scope="col">Failure</th>
						{#each rung_ids as rung_id (rung_id)}
							<th scope="col">
								{rungs[rung_id].label}
								<small class="text_70 display:block font-weight:normal">
									{rungs[rung_id].how}
								</small>
							</th>
						{/each}
					</tr>
				</thead>
				{#each family_ids as family_id (family_id)}
					{@const family_href = resolve(coherence_family_paths[family_id])}
					<tbody>
						<tr>
							<th scope="rowgroup" colspan={rung_ids.length + 1} class="text-align:left">
								<a href={family_href}>{families[family_id].label}</a>
								<small class="text_70 display:block font-weight:normal">
									{families[family_id].summary}
								</small>
							</th>
						</tr>
						{#each family_failures(family_id) as failure (failure.id)}
							<tr>
								<th scope="row" class="text-align:left">
									<a href="{family_href}#{failure.id}">{failure.name}</a>
								</th>
								{#each rung_ids as rung_id (rung_id)}
									{@const hold = failure.holds[rung_id]}
									<td>
										<span class="rung-name text_70">{rungs[rung_id].label}</span>
										{#if hold}
											<a href="{family_href}#{hold_id(failure, rung_id)}">
												<HoldMark status={hold.status} /><span class="sr_only">
													{hold_statuses[hold.status].label}:
												</span>
												{hold.label}{#if hold.status !== 'unreachable' && hold.wanted}
													{' '}<HoldMark status="wanted" /><span class="sr_only">
														, more wanted
													</span>
												{/if}
											</a>
										{:else}
											<span class="nothing text_70" aria-hidden="true">–</span>
											<span class="sr_only">nothing</span>
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				{/each}
			</table>
		</div>
	</section>

	<section>
		<h2 id="tables">The tables</h2>
		<ul>
			{#each coherence_inventory_ids as id (id)}
				<li>
					<a href={resolve(coherence_inventory_pages[id].path)}>
						{coherence_inventory_pages[id].title}
					</a>
				</li>
			{/each}
		</ul>
	</section>
</div>

<style>
	.failure-grid td,
	.failure-grid th {
		vertical-align: top;
	}
	/* the rung's name sits in the column header when there are columns */
	.rung-name,
	.nothing {
		display: none;
	}
	/* the grid answers to the room it has, which the sidebar changes, not to the viewport */
	.grid-box {
		container-type: inline-size;
	}
	/* without room for five columns each failure is a card, its rungs the steps down it */
	@container (max-width: 720px) {
		.failure-grid,
		.failure-grid tbody,
		.failure-grid tr,
		.failure-grid th,
		.failure-grid td {
			display: block;
		}
		.failure-grid thead {
			display: none;
		}
		.failure-grid tr {
			padding: var(--space_md) 0;
		}
		.failure-grid td {
			display: grid;
			grid-template-columns: var(--space_xl7) minmax(0, 1fr);
			gap: var(--space_sm);
		}
		.rung-name,
		.nothing {
			display: block;
		}
	}
</style>
