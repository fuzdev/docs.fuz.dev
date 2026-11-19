<script lang="ts">
	/**
	 * The legend for the marks a hold carries: each status, and the mark for
	 * something wanted.
	 *
	 * @module
	 */

	import { hold_status_ids, hold_statuses, wanted_legend } from './coherence.ts';
	import HoldMark from './HoldMark.svelte';
</script>

<ul class="unstyled row_wrap gap_md mb_lg">
	{#each hold_status_ids as id (id)}
		<li>
			<small>
				<HoldMark status={id} />
				<strong>{hold_statuses[id].label}</strong>
				<span class="text_70">{hold_statuses[id].meaning}</span>
			</small>
		</li>
	{/each}
	<li>
		<small>
			<HoldMark status="wanted" />
			<strong>{wanted_legend.label}</strong>
			<span class="text_70">{wanted_legend.meaning}</span>
		</small>
	</li>
</ul>
