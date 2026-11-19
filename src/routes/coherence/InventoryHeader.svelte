<script lang="ts">
	/**
	 * The top of an inventory's page: its title, its passage, and the holds
	 * whose instances the table lists, each linked to its entry.
	 *
	 * @module
	 */

	import { resolve } from '$app/paths';

	import {
		failure_reached_holds,
		failures,
		hold_id,
		passages,
		type InventoryId
	} from './coherence.ts';
	import { coherence_family_paths, coherence_inventory_pages } from './coherence_pages.ts';

	const { inventory }: { inventory: InventoryId } = $props();

	const title = $derived(coherence_inventory_pages[inventory].title);

	const listed_holds = $derived(
		failures.flatMap((failure) =>
			failure_reached_holds(failure)
				.filter(({ hold }) => hold.inventories?.includes(inventory))
				.map(({ rung, hold }) => ({ failure, hold, id: hold_id(failure, rung) }))
		)
	);
</script>

<svelte:head>
	<title>{title.toLowerCase()} - coherence - docs.fuz.dev</title>
</svelte:head>

<header>
	<h1>{title}</h1>
	<p class="width_atmost_md">{passages[inventory]}</p>
	<p class="width_atmost_md">
		<small>
			<span class="text_70">The holds whose instances this table lists:</span>
			{#each listed_holds as { failure, hold, id }, index (id)}
				{#if index > 0}<span class="text_70">;</span>{' '}{/if}<a
					href="{resolve(coherence_family_paths[failure.family])}#{id}"
				>
					{hold.label}
				</a>
				<span class="text_70">({failure.name})</span>
			{/each}
		</small>
	</p>
</header>
