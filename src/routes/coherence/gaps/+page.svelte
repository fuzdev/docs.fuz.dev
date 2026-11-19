<script lang="ts">
	import { resolve } from '$app/paths';
	import Mdz from '@fuzdev/mdz/Mdz.svelte';

	import PageSections from '#routes/PageSections.svelte';
	import {
		failure_blank_rungs,
		failure_holds,
		failure_reached_holds,
		failures,
		families,
		family_failures,
		family_ids,
		gate_gaps,
		hold_id,
		kept_actions,
		mechanisms,
		passages,
		rungs
	} from '#routes/coherence/coherence.ts';
	import {
		coherence_family_paths,
		coherence_gaps_page,
		coherence_inventory_pages
	} from '#routes/coherence/coherence_pages.ts';
	import { gaps_sections } from '#routes/coherence/gaps_sections.ts';
	import HoldMark from '#routes/coherence/HoldMark.svelte';

	const reached = failures.flatMap((f) => failure_reached_holds(f));
	const in_places_count = reached.filter(({ hold }) => hold.status === 'in_places').length;

	// the actions no tool refuses and no permission rule denies
	const unrefused_actions = kept_actions.filter(
		(kept) => !kept.held_by.includes('tool') && !kept.held_by.includes('deny')
	);

	const sections = gaps_sections;

	const list = (labels: Array<string>): string =>
		labels.length < 2
			? labels.join('')
			: `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
</script>

<svelte:head>
	<title>{coherence_gaps_page.title.toLowerCase()} - coherence - docs.fuz.dev</title>
</svelte:head>

<PageSections {sections}>
	<header>
		<h1>{coherence_gaps_page.title}</h1>
		<p class="width_atmost_md">{passages.gaps}</p>
		<p class="width_atmost_md">
			<small>
				{in_places_count} of the {reached.length} holds are in places.
			</small>
		</p>
	</header>

	{#each family_ids as family_id (family_id)}
		{@const family_href = resolve(coherence_family_paths[family_id])}
		<section>
			<h2 id={family_id}>{families[family_id].label}</h2>
			{#each family_failures(family_id) as failure (failure.id)}
				{@const blank = failure_blank_rungs(failure)}
				<article class="py_md">
					<h3><a href="{family_href}#{failure.id}">{failure.name}</a></h3>
					<ul class="unstyled">
						{#each failure_holds(failure) as { rung, hold } (rung)}
							{#if hold.status === 'unreachable'}
								<li class="mb_sm">
									<HoldMark status="unreachable" />
									<a href="{family_href}#{hold_id(failure, rung)}">{rungs[rung].label}</a>
									<span class="text_70">is out of reach:</span>
									{hold.why}
								</li>
							{:else if hold.gap}
								<li class="mb_sm">
									<HoldMark status="in_places" />
									<a href="{family_href}#{hold_id(failure, rung)}">
										{rungs[rung].label}: {hold.label}
									</a>
									<span class="text_70">leaves out:</span>
									{hold.gap}
									{#if hold.wanted}
										<div>
											<HoldMark status="wanted" />
											<span class="text_70">Wanted:</span>
											{hold.wanted}
										</div>
									{/if}
								</li>
							{/if}
						{/each}
						{#if blank.length > 0}
							<li class="mb_sm text_70">
								Nothing at the {list(blank.map((rung) => rungs[rung].label))}
								{blank.length === 1 ? 'rung' : 'rungs'} is aimed at it.
							</li>
						{/if}
					</ul>
				</article>
			{/each}
		</section>
	{/each}

	<section>
		<h2 id="actions">{sections.actions}</h2>
		<p class="width_atmost_md">{passages.gaps_actions}</p>
		<ul class="unstyled">
			{#each unrefused_actions as kept (kept.action)}
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

	<section>
		<h2 id="ci">{sections.ci}</h2>
		<p class="width_atmost_md">{passages.gate_gaps}</p>
		<ul>
			{#each gate_gaps as gap (gap)}
				<li><Mdz content={gap} inline /></li>
			{/each}
		</ul>
		<p>
			<small>
				From
				<a href={resolve(coherence_inventory_pages.gates.path)}>
					{coherence_inventory_pages.gates.title}
				</a>.
			</small>
		</p>
	</section>
</PageSections>
