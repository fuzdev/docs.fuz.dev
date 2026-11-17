<script lang="ts">
	import Mdz from '@fuzdev/mdz/Mdz.svelte';
	import { site_context } from '@fuzdev/fuz_ui/site.svelte.ts';

	import {
		claims_checked,
		contexts,
		decisions,
		efficiency,
		headword,
		method,
		reviewed,
		stated_orders,
		term_ids,
		terms,
		value_kind_ids,
		value_kinds,
		values,
		type TermId
	} from './values.ts';
	import { values_sections, type ValuesSectionId } from './values_sections.ts';

	const site = site_context.get();

	// the terms that appear in a decision, in the terms' own order, as the matrix's rows and columns
	const decided_terms = term_ids.filter((id) =>
		decisions.some((d) => d.won === id || d.lost === id)
	);
	const decision_id = (index: number): string => `decision-${index + 1}`;

	// the term under the pointer, which every other chip of that term lights up with
	let hovered: TermId | null = $state.raw(null);
</script>

<svelte:head>
	<title>the values the Fuz stack is designed against - docs.fuz.dev</title>
</svelte:head>

{#snippet term_chip(id: TermId | null, label?: string)}
	{@const term = id === null ? undefined : terms[id]}
	<!-- a hover affordance only: the label carries the meaning, and nothing is reached by it -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<span
		class={[
			'chip',
			term && `palette_${term.palette}`,
			{ 'opacity:40%': hovered !== null && hovered !== id }
		]}
		onmouseenter={() => (hovered = id)}
		onmouseleave={() => (hovered = null)}
	>
		{label ?? term?.label}
	</span>
{/snippet}

{#snippet section_heading(id: ValuesSectionId)}
	<h2 {id}>{values_sections[id]}</h2>
{/snippet}

{#snippet source(content: string)}
	<Mdz {content} inline />
{/snippet}

<div>
	<header>
		<h1>The values the Fuz stack is designed against</h1>
		<p class="width_atmost_md">{headword.text} {@render source(headword.source)}.</p>
		<p class="width_atmost_md">
			<strong>This page is a sketch.</strong> It draws the same data several ways, to choose which
			views are worth keeping. It names only projects on the
			<a href="https://www.fuz.dev/stack">Fuz stack page</a>.
		</p>
		<p class="width_atmost_md">
			<small>
				Claude Fable 5.2 wrote this page and its
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href="{site.repo_url}/blob/main/src/routes/values/values.ts">data file</a>. Its claims
				were checked against the repos on <time datetime={claims_checked}>{claims_checked}</time>.
				The maintainer {reviewed ? 'has reviewed it' : 'has not yet reviewed it'}.
			</small>
		</p>
	</header>

	<section>
		{@render section_heading('values')}
		<p class="width_atmost_md">
			Each value is stated as a question to ask of a design, with a decision that passes it and
			where the stack falls short of it. The values are not one kind of thing, which is why no
			single ranked list holds them:
		</p>
		<ul class="unstyled column gap_xs mb_lg">
			{#each value_kind_ids as kind_id (kind_id)}
				<li>
					<small>
						<strong>{value_kinds[kind_id].label}</strong>
						<span class="text_70">{value_kinds[kind_id].meaning}</span>
						{#each term_ids.filter((id) => terms[id].kind === kind_id) as id (id)}
							{@render term_chip(id)}{' '}
						{/each}
					</small>
				</li>
			{/each}
		</ul>
		{#each values as value (value.id)}
			<article id={value.id} class="py_md">
				<h3>{value.name}</h3>
				<dl class="record-fields">
					<dt>Ranked as</dt>
					<dd>
						{#each value.terms as id (id)}
							{@render term_chip(id)}
							<small class="text_70">{value_kinds[terms[id].kind].label}</small>{' '}
						{/each}
					</dd>
					<dt>Means</dt>
					<dd>{value.means}</dd>
					<dt>Asks</dt>
					<dd>{value.question}</dd>
					<dt>Passes</dt>
					<dd>{@render source(value.passes)}</dd>
					<dt>Falls short</dt>
					<dd>{value.shortfall}</dd>
				</dl>
			</article>
		{/each}
		<article class="py_md">
			<h3>Method</h3>
			<p class="width_atmost_md">{method.text}</p>
			<ul class="unstyled">
				{#each method.evidence as evidence (evidence)}
					<li>{@render source(evidence)}</li>
				{/each}
			</ul>
		</article>
	</section>

	<section>
		{@render section_heading('orders')}
		<p class="width_atmost_md">
			Several projects state the order they weigh things in. Each column is one project's own list,
			highest first, in its own words. Items side by side are a stated tie, and a grey item is one
			this page does not track. Point at an item to find it in the other columns.
		</p>
		<div class="orders">
			{#each stated_orders as order (order.project)}
				<section class="order">
					<h3>{order.project}</h3>
					<ol class="unstyled column gap_xs">
						{#each order.ranks as rank, index (index)}
							<li class="rank-row">
								<small class="text_70">{index + 1}</small>
								<div class="row_wrap gap_xs">
									{#each rank as item (item.label)}
										{@render term_chip(item.term, item.label)}
									{/each}
								</div>
							</li>
						{/each}
					</ol>
					{#if order.overarching}
						<p class="overarching">
							<small class="text_70">over all</small>
							{@render term_chip(order.overarching.term, order.overarching.label)}
						</p>
					{/if}
					<p><small>{@render source(order.source)}</small></p>
				</section>
			{/each}
		</div>
	</section>

	<section>
		{@render section_heading('contexts')}
		<p class="width_atmost_md">
			Within performance the usual order is speed, then size and memory. The situation changes it,
			and the documents say why each time.
		</p>
		<div class="overflow-x:auto">
			<table>
				<thead>
					<tr>
						<th scope="col">Where</th>
						<th scope="col">Order</th>
						<th scope="col">Why</th>
						<th scope="col">Source</th>
					</tr>
				</thead>
				<tbody>
					{#each contexts as context (context.id)}
						<tr>
							<th scope="row" class="text-align:left">{context.name}</th>
							<td class="white-space:nowrap">
								{#each context.order as rank, rank_index (rank_index)}
									{#if rank_index > 0}{' '}<span class="text_70">&gt;</span>{' '}{/if}
									{#each rank as axis, axis_index (axis)}
										{#if axis_index > 0}{' '}<span class="text_70">=</span>{' '}{/if}
										{@render term_chip(axis)}
									{/each}
								{/each}
							</td>
							<td>{context.why}</td>
							<td>{@render source(context.source)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<h3>Efficiency</h3>
		<p class="width_atmost_md">{efficiency.text}</p>
		<ul class="unstyled">
			{#each efficiency.evidence as evidence (evidence)}
				<li>{@render source(evidence)}</li>
			{/each}
		</ul>
	</section>

	<section>
		{@render section_heading('decisions')}
		<p class="width_atmost_md">
			These are recorded decisions where one value was chosen over another. A row is what won and a
			column is what it won over. Where both cells of a pair are filled, the answer depended on the
			context.
		</p>
		<div class="overflow-x:auto">
			<table>
				<thead>
					<tr>
						<th scope="col"><small class="text_70">won, over</small></th>
						{#each decided_terms as id (id)}
							<th scope="col">{@render term_chip(id)}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each decided_terms as winner (winner)}
						<tr>
							<th scope="row" class="text-align:left">{@render term_chip(winner)}</th>
							{#each decided_terms as loser (loser)}
								<td>
									{#each decisions as decision, index (index)}
										{#if decision.won === winner && decision.lost === loser}
											<div><a href="#{decision_id(index)}">{decision.project}</a></div>
										{/if}
									{/each}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="overflow-x:auto">
			<table>
				<thead>
					<tr>
						<th scope="col">Project</th>
						<th scope="col">Won</th>
						<th scope="col">Over</th>
						<th scope="col">Chose</th>
						<th scope="col">Cost</th>
						<th scope="col">Source</th>
					</tr>
				</thead>
				<tbody>
					{#each decisions as decision, index (index)}
						<tr id={decision_id(index)}>
							<th scope="row" class="text-align:left">{decision.project}</th>
							<td>{@render term_chip(decision.won)}</td>
							<td>{@render term_chip(decision.lost)}</td>
							<td>{decision.chose}</td>
							<td>{decision.cost}</td>
							<td>{@render source(decision.source)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
</div>

<style>
	/* one column per project, as many across as fit */
	.orders {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--distance_xs), 1fr));
		gap: var(--space_xl);
	}
	.order {
		padding-top: var(--space_sm);
		border-top: var(--border_width) solid var(--border_color);
	}
	/* the rank's number stays beside its items when a long one wraps */
	.rank-row {
		display: grid;
		grid-template-columns: var(--space_md) minmax(0, 1fr);
		align-items: baseline;
	}
	/* set apart from the ranks, since it is on none of them */
	.overarching {
		margin-top: var(--space_md);
		padding-top: var(--space_sm);
		border-top: var(--border_width) dashed var(--border_color);
	}
</style>
