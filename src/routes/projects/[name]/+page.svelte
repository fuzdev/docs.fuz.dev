<script lang="ts">
	import { resolve } from '$app/paths';
	import Mdz from '@fuzdev/mdz/Mdz.svelte';

	import {
		hold_id,
		hold_statuses,
		mechanisms,
		oracle_kinds,
		rungs,
		run_whens
	} from '#routes/coherence/coherence.ts';
	import {
		coherence_family_paths,
		coherence_inventory_pages
	} from '#routes/coherence/coherence_pages.ts';
	import HoldMark from '#routes/coherence/HoldMark.svelte';
	import PageSections from '#routes/PageSections.svelte';
	import { project_lens_sections, project_lenses } from '#routes/projects/project_lens.ts';
	import { terms } from '#routes/values/values.ts';

	const { data }: { data: { name: string } } = $props();

	// `load` has already refused a name with no page
	const lens = $derived(project_lenses.find((l) => l.project.name === data.name));
	const sections = $derived(lens ? project_lens_sections(lens) : {});
</script>

<svelte:head>
	<title>{data.name} - projects - docs.fuz.dev</title>
</svelte:head>

{#if lens}
	{@const project = lens.project}
	<PageSections {sections}>
		<header>
			<h1>{project.name}</h1>
			<p class="width_atmost_md">
				What this site's data says of
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href="https://github.com/fuzdev/{project.repos[0]}">{project.name}</a>: every record on
				the <a href={resolve('/coherence')}>coherence</a> and
				<a href={resolve('/values')}>values</a> pages that names it or links it. This page is
				computed from those records and adds nothing to them. For what the project is, see the
				<a href="https://www.fuz.dev/stack">Fuz stack page</a>.
			</p>
		</header>

		{#if lens.failures.length > 0 || lens.holds.length > 0}
			<section>
				<h2 id="holds">{sections.holds}</h2>
				<ul class="unstyled">
					{#each lens.failures as failure (failure.id)}
						<li class="mb_sm">
							<a href="{resolve(coherence_family_paths[failure.family])}#{failure.id}">
								{failure.name}
							</a>
							<span class="text_70">— {failure.summary}</span>
						</li>
					{/each}
					{#each lens.holds as { failure, rung, hold } (hold_id(failure, rung))}
						<li class="mb_sm">
							<HoldMark status={hold.status} /><span class="sr_only">
								{hold_statuses[hold.status].label}:
							</span>
							<a href="{resolve(coherence_family_paths[failure.family])}#{hold_id(failure, rung)}">
								{rungs[rung].label}: {hold.label}
							</a>
							<span class="text_70">— {failure.name}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if lens.comparisons.length > 0}
			<section>
				<h2 id="oracles">{sections.oracles}</h2>
				<div class="overflow-x:auto">
					<table>
						<thead>
							<tr>
								<th scope="col">Compared</th>
								<th scope="col">Against</th>
								<th scope="col">Kind</th>
								<th scope="col">Runs</th>
								<th scope="col">Source</th>
							</tr>
						</thead>
						<tbody>
							{#each lens.comparisons as comparison (`${comparison.project}|${comparison.against}`)}
								<tr>
									<th scope="row" class="text-align:left">{comparison.project}</th>
									<td>{comparison.against}</td>
									<td>{oracle_kinds[comparison.kind].label}</td>
									<td>
										{#each comparison.runs as run (run.when)}
											<div class="white-space:nowrap">
												<strong>{run_whens[run.when].label}</strong
												>{#if run.what}<span class="text_70">: {run.what}</span>{/if}
											</div>
										{/each}
									</td>
									<td><Mdz content={comparison.source} inline /></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p>
					<small>
						From
						<a href={resolve(coherence_inventory_pages.oracles.path)}>
							{coherence_inventory_pages.oracles.title}
						</a>.
					</small>
				</p>
			</section>
		{/if}

		{#if lens.gates.length > 0 || lens.gate_gaps.length > 0}
			<section>
				<h2 id="gates">{sections.gates}</h2>
				{#if lens.gates.length > 0}
					<ul class="unstyled">
						{#each lens.gates as gate (gate.gate)}
							<li class="mb_sm">
								<strong>{gate.gate}</strong>
								<span class="text_70">({run_whens[gate.runs].label.toLowerCase()})</span>:
								{gate.catches}. <span class="text_70">Where:</span>
								{gate.where}.
							</li>
						{/each}
					</ul>
				{/if}
				{#if lens.gate_gaps.length > 0}
					<ul>
						{#each lens.gate_gaps as gap (gap)}
							<li><Mdz content={gap} inline /></li>
						{/each}
					</ul>
				{/if}
				<p>
					<small>
						From
						<a href={resolve(coherence_inventory_pages.gates.path)}>
							{coherence_inventory_pages.gates.title}
						</a>. A gate is listed here when its row names the project or links its repo, so one
						that every repo of a kind runs may be missing.
					</small>
				</p>
			</section>
		{/if}

		{#if lens.kept_actions.length > 0}
			<section>
				<h2 id="actions">{sections.actions}</h2>
				<ul class="unstyled">
					{#each lens.kept_actions as kept (kept.action)}
						<li class="mb_sm">
							<strong>{kept.action}</strong>
							<span class="text_70">
								({kept.held_by.map((id) => mechanisms[id].label.toLowerCase()).join(', ')})
							</span>: {kept.how}.
						</li>
					{/each}
				</ul>
				<p>
					<small>
						From
						<a href={resolve(coherence_inventory_pages.actions.path)}>
							{coherence_inventory_pages.actions.title}
						</a>.
					</small>
				</p>
			</section>
		{/if}

		{#if lens.moved_rules.length > 0}
			<section>
				<h2 id="moved">{sections.moved}</h2>
				<ul class="unstyled">
					{#each lens.moved_rules as moved (moved.was)}
						<li class="mb_sm">
							<strong>{moved.was}</strong>
							<span class="text_70">became:</span>
							{moved.became}.
						</li>
					{/each}
				</ul>
				<p>
					<small>
						From
						<a href={resolve(coherence_inventory_pages.moved.path)}>
							{coherence_inventory_pages.moved.title}
						</a>.
					</small>
				</p>
			</section>
		{/if}

		{#if sections.values}
			<section>
				<h2 id="values">{sections.values}</h2>
				{#each lens.stated_orders as order (order.project)}
					<p class="width_atmost_md">
						The order {order.project} states its priorities in, highest first
						(<Mdz content={order.source} inline />):
					</p>
					<ol>
						{#each order.ranks as rank (rank.map((item) => item.label).join('|'))}
							<li>{rank.map((item) => item.label).join(', ')}</li>
						{/each}
					</ol>
					{#if order.overarching}
						<p class="width_atmost_md">
							<span class="text_70">Over every choice:</span>
							{order.overarching.label}.
						</p>
					{/if}
				{/each}
				<ul class="unstyled">
					{#each lens.decisions as decision, index (index)}
						<li class="mb_sm">
							<span class="text_70">A decision:</span>
							<strong>{terms[decision.won].label} over {terms[decision.lost].label}</strong>.
							{decision.chose}. <span class="text_70">Cost:</span>
							{decision.cost}. <Mdz content={decision.source} inline />
						</li>
					{/each}
					{#each lens.passes as { value, pass } (`${value.id}|${pass}`)}
						<li class="mb_sm">
							<span class="text_70">Passes the question of</span>
							<strong>{value.name.toLowerCase()}</strong>: <Mdz content={pass} inline />
						</li>
					{/each}
					{#each lens.shortfalls as value (value.id)}
						<li class="mb_sm">
							<span class="text_70">Where the stack falls short of</span>
							<strong>{value.name.toLowerCase()}</strong>: {value.shortfall}
						</li>
					{/each}
					{#each lens.contexts as context (context.id)}
						<li class="mb_sm">
							<span class="text_70">A context:</span>
							<strong>{context.name}</strong>. {context.why}
							<Mdz content={context.source} inline />
						</li>
					{/each}
					{#each lens.passage_evidence as evidence (evidence)}
						<li class="mb_sm">
							<span class="text_70">Cited for how claims are made:</span>
							<Mdz content={evidence} inline />
						</li>
					{/each}
				</ul>
				<p>
					<small>From the <a href={resolve('/values')}>values</a> page.</small>
				</p>
			</section>
		{/if}
	</PageSections>
{/if}
