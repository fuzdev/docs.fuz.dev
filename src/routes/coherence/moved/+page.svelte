<script lang="ts">
	import Mdz from '@fuzdev/mdz/Mdz.svelte';

	import { moved_rules, rungs } from '#routes/coherence/coherence.ts';
	import InventoryHeader from '#routes/coherence/InventoryHeader.svelte';
</script>

<InventoryHeader inventory="moved" />
<div class="overflow-x:auto">
	<table>
		<thead>
			<tr>
				<th scope="col">The rule was</th>
				<th scope="col">It became</th>
				<th scope="col">Held now by</th>
				<th scope="col">Source</th>
			</tr>
		</thead>
		<tbody>
			{#each moved_rules as moved (moved.was)}
				<tr>
					<th scope="row" class="text-align:left">{moved.was}</th>
					<td>{moved.became}</td>
					<td>
						{#each moved.to as rung_id (rung_id)}
							<div class="white-space:nowrap">{rungs[rung_id].label}</div>
						{/each}
					</td>
					<td><Mdz content={moved.source} inline /></td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
