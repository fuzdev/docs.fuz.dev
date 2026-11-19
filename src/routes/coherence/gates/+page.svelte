<script lang="ts">
	import { resolve } from '$app/paths';
	import Mdz from '@fuzdev/mdz/Mdz.svelte';

	import { gate_gaps, gates, passages, run_whens } from '#routes/coherence/coherence.ts';
	import InventoryHeader from '#routes/coherence/InventoryHeader.svelte';
	import Probes from '#routes/coherence/Probes.svelte';
	import RunLegend from '#routes/coherence/RunLegend.svelte';
	import { repo_classes } from '#routes/projects/repo_classes.ts';
	import { class_repos, stack_snapshot } from '#routes/projects/stack_data.ts';
</script>

<InventoryHeader inventory="gates" />
<p class="width_atmost_md">
	{passages.where_class}
	<small>
		Read from the repos on <time datetime={stack_snapshot.checked}>{stack_snapshot.checked}</time>.
	</small>
</p>
<p class="width_atmost_md">{passages.probes}</p>
<RunLegend />
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
					<td>
						{gate.where}
						{#if gate.where_class}
							<div>
								<small>
									<span class="text_70">The repos {repo_classes[gate.where_class].label}:</span>
									{#each class_repos(gate.where_class) as repo, index (repo.repo)}
										{#if index > 0},{' '}{/if}<a
											href={resolve('/projects/[name]', { name: repo.project })}
										>
											{repo.repo}
										</a>
									{/each}
								</small>
							</div>
						{/if}
					</td>
					<td>
						<Mdz content={gate.source} inline />
						<Probes probes={gate.probes ?? []} />
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
<section>
	<h2 id="gaps">CI gaps</h2>
	<p class="width_atmost_md">{passages.gate_gaps}</p>
	<ul>
		{#each gate_gaps as gap (gap)}
			<li><Mdz content={gap} inline /></li>
		{/each}
	</ul>
</section>
