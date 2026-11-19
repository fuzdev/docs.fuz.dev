<script lang="ts">
	/**
	 * The mark for a hold's status, or for something wanted and not built,
	 * sized to the text it sits in.
	 *
	 * @module
	 */

	import type { HoldStatusId } from './coherence.ts';

	const { status }: { status: HoldStatusId | 'wanted' } = $props();
</script>

<svg class="mark" viewBox="0 0 12 12" aria-hidden="true">
	{#if status === 'wanted'}
		<circle
			cx="6"
			cy="6"
			r="5"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-dasharray="2 2"
		/>
	{:else}
		<circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.5" />
		{#if status === 'throughout'}
			<circle cx="6" cy="6" r="5" fill="currentColor" />
		{:else if status === 'in_places'}
			<path d="M6 1 A5 5 0 0 0 6 11 Z" fill="currentColor" />
		{:else}
			<path d="M2.5 9.5 L9.5 2.5" stroke="currentColor" stroke-width="1.5" />
		{/if}
	{/if}
</svg>

<style>
	/* sized in em so the mark scales with the text it sits in */
	.mark {
		display: inline-block;
		width: 0.7em;
		height: 0.7em;
	}
</style>
