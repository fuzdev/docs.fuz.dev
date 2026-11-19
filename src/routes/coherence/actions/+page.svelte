<script lang="ts">
	import Mdz from '@fuzdev/mdz/Mdz.svelte';

	import { kept_actions, mechanism_ids, mechanisms } from '#routes/coherence/coherence.ts';
	import InventoryHeader from '#routes/coherence/InventoryHeader.svelte';

	const rule_only_count = kept_actions.filter(
		(kept) => kept.held_by.length === 1 && kept.held_by[0] === 'rule'
	).length;
</script>

<InventoryHeader inventory="actions" />
<p class="width_atmost_md">
	A written rule and nothing else holds {rule_only_count} of the {kept_actions.length}.
</p>
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
					<td><Mdz content={kept.source} inline /></td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
