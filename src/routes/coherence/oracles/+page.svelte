<script lang="ts">
	import Mdz from '@fuzdev/mdz/Mdz.svelte';

	import {
		oracle_comparisons,
		oracle_kind_ids,
		oracle_kinds,
		passages,
		run_whens
	} from '#routes/coherence/coherence.ts';
	import InventoryHeader from '#routes/coherence/InventoryHeader.svelte';
	import Probes from '#routes/coherence/Probes.svelte';
	import RunLegend from '#routes/coherence/RunLegend.svelte';
</script>

<InventoryHeader inventory="oracles" />
<p class="width_atmost_md">{passages.probes}</p>
<RunLegend />
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
							<Probes probes={run.probes ?? []} />
						{/each}
					</td>
					<td>
						<Mdz content={comparison.source} inline />
						<Probes probes={comparison.probes ?? []} />
					</td>
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
