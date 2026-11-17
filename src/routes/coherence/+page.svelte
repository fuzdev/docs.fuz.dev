<script lang="ts">
	import Mdz from '@fuzdev/mdz/Mdz.svelte';
	import { site_context } from '@fuzdev/fuz_ui/site.svelte.ts';

	import {
		claims_checked,
		failure_holds,
		failures,
		gate_gaps,
		gates,
		hold_id,
		hold_status_ids,
		hold_statuses,
		kept_actions,
		mechanism_ids,
		mechanisms,
		oracle_comparisons,
		oracle_kind_ids,
		oracle_kinds,
		rung_ids,
		rungs,
		run_when_ids,
		run_whens,
		wanted_legend,
		type HoldStatusId,
		type InventoryId
	} from './coherence.ts';
	import { coherence_sections, type CoherenceSectionId } from './coherence_sections.ts';

	const site = site_context.get();

	// each table links back to the holds that point at it
	const listed_holds = (inventory: InventoryId) =>
		failures.flatMap((failure) =>
			failure_holds(failure)
				.filter(({ hold }) => hold.inventory === inventory)
				.map(({ rung, hold }) => ({ failure, hold, id: hold_id(failure, rung) }))
		);

	const reviewed_count = failures.filter((f) => f.reviewed).length;
	const review_state =
		reviewed_count === 0
			? 'has not yet reviewed its rows'
			: reviewed_count === failures.length
				? 'has reviewed every row'
				: `has reviewed ${reviewed_count} of its ${failures.length} rows`;
</script>

<svelte:head>
	<title>keeping software coherent at agent speed - docs.fuz.dev</title>
</svelte:head>

{#snippet status_shape(status: HoldStatusId)}
	<svg class="mark" viewBox="0 0 12 12" aria-hidden="true">
		<circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.5" />
		{#if status === 'held'}
			<circle cx="6" cy="6" r="5" fill="currentColor" />
		{:else if status === 'partial'}
			<path d="M6 1 A5 5 0 0 0 6 11 Z" fill="currentColor" />
		{:else}
			<path d="M2.5 9.5 L9.5 2.5" stroke="currentColor" stroke-width="1.5" />
		{/if}
	</svg>
{/snippet}

{#snippet wanted_shape()}
	<svg class="mark" viewBox="0 0 12 12" aria-hidden="true">
		<circle
			cx="6"
			cy="6"
			r="5"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-dasharray="2 2"
		/>
	</svg>
{/snippet}

{#snippet source(content: string)}
	<Mdz {content} inline />
{/snippet}

{#snippet section_heading(id: CoherenceSectionId)}
	<h2 {id}>{coherence_sections[id]}</h2>
{/snippet}

{#snippet listed_by(inventory: InventoryId)}
	<p class="width_atmost_md">
		<small>
			<span class="text_70">The holds whose instances this table lists:</span>
			{#each listed_holds(inventory) as { failure, hold, id }, index (id)}
				{#if index > 0}<span class="text_70">;</span>{' '}{/if}<a href="#{id}">{hold.label}</a>
				<span class="text_70">({failure.name})</span>
			{/each}
		</small>
	</p>
{/snippet}

<main>
	<header>
		<h1>Keeping software coherent at agent speed</h1>
		<p class="width_atmost_md">
			Agents write a growing share of the Fuz stack's code. Software is coherent when it still reads
			as one design: one way to do each thing, one name for each concept, documents that are still
			true, and checks that mean what they say. This page lists the ways agent-written code loses
			that, and what the stack does about each.
		</p>
		<p class="width_atmost_md">
			A failure can be held anywhere from a person's judgment to the shape of the system. Each rung
			down the ladder depends less on anyone remembering than the one before it, and usually takes
			more work to build. A rule moves along when its next form is simpler than the rule.
		</p>
		<p class="width_atmost_md">
			<small>
				Claude Fable 5.2 wrote this page and its
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href="{site.repo_url}/blob/main/src/routes/coherence/coherence.ts">data file</a>. Its
				claims were checked against the repos on
				<time datetime={claims_checked}>{claims_checked}</time>. The maintainer {review_state}.
			</small>
		</p>
	</header>

	<section>
		{@render section_heading('grid')}
		<p class="width_atmost_md">
			A row is a failure and a column is what holds it. A blank cell means nothing at that rung
			holds the failure today.
		</p>
		<ul class="unstyled row_wrap gap_md mb_lg">
			{#each hold_status_ids as id (id)}
				{@const status = hold_statuses[id]}
				<li>
					<small>
						{@render status_shape(id)}
						<strong>{status.label}</strong>
						<span class="text_70">{status.meaning}</span>
					</small>
				</li>
			{/each}
			<li>
				<small>
					{@render wanted_shape()}
					<strong>{wanted_legend.label}</strong>
					<span class="text_70">{wanted_legend.meaning}</span>
				</small>
			</li>
		</ul>
		<div class="grid-box">
			<table class="failure-grid">
				<thead>
					<tr>
						<th scope="col">Failure</th>
						{#each rung_ids as rung_id (rung_id)}
							<th scope="col">
								{rungs[rung_id].label}
								<small class="text_70 display:block font-weight:normal">
									{rungs[rung_id].lives}
								</small>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each failures as failure (failure.id)}
						<tr>
							<th scope="row" class="text-align:left">
								<a href="#{failure.id}">{failure.name}</a>
							</th>
							{#each rung_ids as rung_id (rung_id)}
								{@const hold = failure.holds[rung_id]}
								<td>
									<span class="rung-name text_70">{rungs[rung_id].label}</span>
									{#if hold}
										<a href="#{hold_id(failure, rung_id)}">
											{@render status_shape(hold.status)}<span class="sr_only">
												{hold_statuses[hold.status].label}:
											</span>
											{hold.label}{#if hold.wanted}
												{' '}{@render wanted_shape()}<span class="sr_only">, more wanted</span>
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
			</table>
		</div>
	</section>

	<section>
		{@render section_heading('holds')}
		{#each failures as failure (failure.id)}
			<section id={failure.id} class="failure pt_lg">
				<h3>{failure.name}</h3>
				<p class="width_atmost_md">
					{failure.failure}
					<small class="text_70">
						{failure.reviewed
							? 'Reviewed by the maintainer.'
							: 'Not yet reviewed by the maintainer.'}
					</small>
				</p>
				{#each failure_holds(failure) as { rung, hold } (rung)}
					<article id={hold_id(failure, rung)} class="py_md">
						<h4>{rungs[rung].label}: {hold.label}</h4>
						<dl class="record-fields">
							<dt>Status</dt>
							<dd>{@render status_shape(hold.status)} {hold_statuses[hold.status].label}</dd>
							<dt>{hold.status === 'unreachable' ? 'Why' : 'Does'}</dt>
							<dd>{hold.does}</dd>
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
								<dd>{@render wanted_shape()} {hold.wanted}</dd>
							{/if}
							{#if hold.evidence.length > 0}
								<dt>Evidence</dt>
								<dd>
									<ul class="unstyled">
										{#each hold.evidence as evidence (evidence)}
											<li>{@render source(evidence)}</li>
										{/each}
									</ul>
								</dd>
							{/if}
							{#if hold.inventory}
								<dt>Listed</dt>
								<dd><a href="#{hold.inventory}">{coherence_sections[hold.inventory]}</a></dd>
							{/if}
						</dl>
					</article>
				{/each}
			</section>
		{/each}
	</section>

	<section>
		{@render section_heading('oracles')}
		<p class="width_atmost_md">
			Each project below checks its output against an oracle, something to agree with: a reference
			that already has the right behavior, a suite, a twin, or a law the output must satisfy. A row
			names what the project compares itself against, how, and when the comparison runs. A check
			that runs on every change catches more than one that runs before a release, so the rows are
			sorted by the strongest weight each can bear.
		</p>
		{@render listed_by('oracles')}
		<ul class="unstyled row_wrap gap_md mb_lg">
			{#each run_when_ids as id (id)}
				<li>
					<small>
						<strong>{run_whens[id].label}</strong>
						<span class="text_70">{run_whens[id].meaning}</span>
					</small>
				</li>
			{/each}
		</ul>
		<div class="overflow-x:auto">
			<table>
				<thead>
					<tr>
						<th scope="col">Project</th>
						<th scope="col">Compared against</th>
						<th scope="col">Kind</th>
						<th scope="col">How</th>
						<th scope="col">Runs</th>
						<th scope="col">Source</th>
					</tr>
				</thead>
				<tbody>
					{#each oracle_comparisons as comparison (`${comparison.project}|${comparison.against}`)}
						{@const kind = oracle_kinds[comparison.kind]}
						<tr>
							<th scope="row" class="text-align:left">{comparison.project}</th>
							<td>{comparison.against}</td>
							<td title={kind.meaning}>{kind.label}</td>
							<td>{comparison.how}</td>
							<td>
								{#each comparison.runs as run (run.when)}
									<div class="white-space:nowrap">
										<strong>{run_whens[run.when].label}</strong
										>{#if run.what}<span class="text_70">: {run.what}</span>{/if}
									</div>
								{/each}
							</td>
							<td>{@render source(comparison.source)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<ul class="unstyled row_wrap gap_md">
			{#each oracle_kind_ids as id (id)}
				<li>
					<small>
						<strong>{oracle_kinds[id].label}</strong>
						<span class="text_70">{oracle_kinds[id].meaning}</span>
					</small>
				</li>
			{/each}
		</ul>
	</section>

	<section>
		{@render section_heading('actions')}
		<p class="width_atmost_md">
			These are the actions the stack keeps with the maintainer, each with what stops an agent from
			taking it, strongest first. The last rows are held by a written rule and nothing else.
		</p>
		{@render listed_by('actions')}
		<ul class="unstyled row_wrap gap_md mb_lg">
			{#each mechanism_ids as id (id)}
				<li>
					<small>
						<strong>{mechanisms[id].label}</strong>
						<span class="text_70">{mechanisms[id].meaning}</span>
					</small>
				</li>
			{/each}
		</ul>
		<div class="overflow-x:auto">
			<table>
				<thead>
					<tr>
						<th scope="col">Action</th>
						<th scope="col">Held by</th>
						<th scope="col">How</th>
						<th scope="col">Source</th>
					</tr>
				</thead>
				<tbody>
					{#each kept_actions as kept (kept.action)}
						<tr>
							<th scope="row" class="text-align:left">{kept.action}</th>
							<td>
								{#each kept.held_by as id (id)}
									<div class="white-space:nowrap">{mechanisms[id].label}</div>
								{/each}
							</td>
							<td>{kept.how}</td>
							<td>{@render source(kept.source)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section>
		{@render section_heading('gates')}
		<p class="width_atmost_md">
			A gate is a check run on a change. Most have to pass before the change counts as done, and the
			last is a review rule. These are the kinds the stack runs, sorted by the same weights as the
			oracles.
		</p>
		{@render listed_by('gates')}
		<div class="overflow-x:auto">
			<table>
				<thead>
					<tr>
						<th scope="col">Gate</th>
						<th scope="col">Catches</th>
						<th scope="col">Runs</th>
						<th scope="col">Where</th>
						<th scope="col">Source</th>
					</tr>
				</thead>
				<tbody>
					{#each gates as gate (gate.gate)}
						<tr>
							<th scope="row" class="text-align:left">{gate.gate}</th>
							<td>{gate.catches}</td>
							<td class="white-space:nowrap">
								<strong>{run_whens[gate.runs].label}</strong>
							</td>
							<td>{gate.where}</td>
							<td>{@render source(gate.source)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="width_atmost_md">Where CI runs less than the local gate, or does not run:</p>
		<ul>
			{#each gate_gaps as gap (gap)}
				<li>{@render source(gap)}</li>
			{/each}
		</ul>
	</section>
</main>

<style>
	/* sized in em so the mark scales with the text it sits in */
	.mark {
		display: inline-block;
		width: 0.7em;
		height: 0.7em;
	}
	.failure-grid td,
	.failure-grid th {
		vertical-align: top;
	}
	/* the rung's name sits in the column header when there are columns */
	.rung-name,
	.nothing {
		display: none;
	}
	.failure {
		border-top: var(--border_width) solid var(--border_color);
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
