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
	import DepEdges from '#routes/projects/DepEdges.svelte';
	import { project_pages } from '#routes/projects/project_page.ts';
	import { project_lens_size } from '#routes/projects/project_lens.ts';
	import ProjectFacets from '#routes/projects/ProjectFacets.svelte';
	import RepoChecks from '#routes/projects/RepoChecks.svelte';
	import { repo_classes } from '#routes/projects/repo_classes.ts';
	import { stack_snapshot } from '#routes/projects/stack_data.ts';
	import { dep_kind_labels, dep_kinds, snapshot_notes } from '#routes/projects/stack_snapshot.ts';
	import { terms } from '#routes/values/values.ts';

	const { data }: { data: { name: string } } = $props();

	// `load` has already refused a name off the stack's list
	const project_page = $derived(project_pages.find((p) => p.project.name === data.name));
	const lens = $derived(project_page?.lens);
	const sections = $derived(project_page?.sections ?? {});
</script>

<svelte:head>
	<title>{data.name} - projects - docs.fuz.dev</title>
</svelte:head>

{#if project_page && lens}
	{@const project = project_page.project}
	<PageSections {sections}>
		<header>
			<h1>{project.name}</h1>
			{#if project_page.facets}
				<p><ProjectFacets facets={project_page.facets} layer /></p>
			{/if}
			<p class="width_atmost_md">
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href="https://github.com/fuzdev/{project.repos[0]}">{project.name}</a> as this site sees
				it: what its repo's own files declare, and every record on the
				<a href={resolve('/coherence')}>coherence</a> and <a href={resolve('/values')}>values</a>
				pages that names it or links it. This page is computed and adds nothing of its own. For what
				the project is, see the <a href="https://www.fuz.dev/stack">Fuz stack page</a>.
			</p>
			{#if project_lens_size(lens) === 0}
				<p class="width_atmost_md">
					<small>The coherence and values pages do not yet name this project.</small>
				</p>
			{/if}
		</header>

		{#if project_page.used_by.length > 0}
			<section>
				<h2 id="used_by">{sections.used_by}</h2>
				<p class="width_atmost_md">{snapshot_notes.consumers} {snapshot_notes.stack_only}</p>
				<DepEdges edges={project_page.used_by} side="from" />
			</section>
		{/if}

		{#if project_page.uses.length > 0}
			<section>
				<h2 id="uses">{sections.uses}</h2>
				<DepEdges edges={project_page.uses} side="to" />
			</section>
		{/if}

		{#if project_page.used_by.length > 0 || project_page.uses.length > 0}
			<p class="width_atmost_md">
				<small>
					Read from the repos' manifests on
					<time datetime={stack_snapshot.checked}>{stack_snapshot.checked}</time>.
					{snapshot_notes.declares} {snapshot_notes.tables} See
					<a href={resolve('/projects/dependencies')}>every dependency in the stack</a>.
				</small>
			</p>
		{/if}

		{#if sections.third_party}
			<section>
				<h2 id="third_party">{sections.third_party}</h2>
				{#each project_page.repos as repo (repo.repo)}
					{#if repo.third_party.length > 0}
						{#if project_page.repos.length > 1}<h3>{repo.repo}</h3>{/if}
						<dl class="record-fields">
							{#each dep_kinds as kind (kind)}
								{@const group = repo.third_party.filter((dep) => dep.kind === kind)}
								{#if group.length > 0}
									<dt title={dep_kind_labels[kind].meaning}>{dep_kind_labels[kind].label}</dt>
									<dd>
										{#each [...new Set(group.map((dep) => dep.manifest))] as manifest (manifest)}
											<div>
												<small class="text_70">
													{manifest === 'npm' ? 'package.json' : 'Cargo.toml'}:
												</small>
												{group
													.filter((dep) => dep.manifest === manifest)
													.map((dep) => dep.name)
													.join(', ')}
											</div>
										{/each}
									</dd>
								{/if}
							{/each}
						</dl>
					{/if}
				{/each}
				<p class="width_atmost_md">
					<small>
						Read from the repo on
						<time datetime={stack_snapshot.checked}>{stack_snapshot.checked}</time>.
						{snapshot_notes.third_party} See
						<a href={resolve('/projects/third-party')}>everything the stack declares</a>.
					</small>
				</p>
			</section>
		{/if}

		{#if project_page.repos.length > 0}
			<section>
				<h2 id="commands">{sections.commands}</h2>
				{#each project_page.repos as repo (repo.repo)}
					{#if project_page.repos.length > 1}<h3>{repo.repo}</h3>{/if}
					<RepoChecks {repo} />
				{/each}
				<p class="width_atmost_md">
					<small>
						Read from the repo on
						<time datetime={stack_snapshot.checked}>{stack_snapshot.checked}</time>.
						{snapshot_notes.commands} {snapshot_notes.check_lines} {snapshot_notes.main} See
						<a href={resolve('/projects/checks')}>every repo's checks</a>.
					</small>
				</p>
			</section>
		{/if}

		{#if lens.intro.length > 0}
			<section>
				<h2 id="opening">{sections.opening}</h2>
				{#each lens.intro as paragraph (paragraph)}
					<p class="width_atmost_md"><Mdz content={paragraph} inline /></p>
				{/each}
				<p>
					<small>From the <a href={resolve('/coherence')}>coherence</a> section's index.</small>
				</p>
			</section>
		{/if}

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

		{#if sections.gates}
			<section>
				<h2 id="gates">{sections.gates}</h2>
				{#if project_page.class_gates.length > 0}
					<ul class="unstyled">
						{#each project_page.class_gates as { gate, repos } (gate.gate)}
							<li class="mb_sm">
								<strong>{gate.gate}</strong>
								<span class="text_70">({run_whens[gate.runs].label.toLowerCase()})</span>:
								{gate.catches}.
								<span class="text_70">
									{repos.map((repo) => repo.repo).join(', ')} {repos.length === 1 ? 'is' : 'are'}
									among the repos {gate.where_class ? repo_classes[gate.where_class].label : ''}.
								</span>
							</li>
						{/each}
					</ul>
				{/if}
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
						</a>. A gate is listed here when its row names the project or links its repo, or speaks
						of a class of repos that the snapshot puts this one in.
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
