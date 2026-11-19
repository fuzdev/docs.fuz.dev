<script lang="ts">
	/**
	 * The legend for when a check runs, soonest first, which the oracle and
	 * gate tables are sorted by.
	 *
	 * @module
	 */

	import { run_when_ids, run_whens } from './coherence.ts';
</script>

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
