<script lang="ts">
	import Mdz from '@fuzdev/mdz/Mdz.svelte';

	import { gate_gaps, gates, passages, run_whens } from '#routes/coherence/coherence.ts';
	import InventoryHeader from '#routes/coherence/InventoryHeader.svelte';
	import RunLegend from '#routes/coherence/RunLegend.svelte';
</script>

<InventoryHeader inventory="gates" />
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
					<td>{gate.where}</td>
					<td><Mdz content={gate.source} inline /></td>
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
