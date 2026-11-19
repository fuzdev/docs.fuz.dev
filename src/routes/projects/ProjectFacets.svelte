<script lang="ts">
	/**
	 * How the stack page files a project, in one line: its status, its
	 * languages, its site, and its layer when asked for. The words are the
	 * stack page's own.
	 *
	 * @module
	 */

	import { stack_facets } from './stack_data.ts';
	import type { StackProjectFacets } from './stack_facets.ts';

	const {
		facets,
		layer = false
	}: {
		facets: StackProjectFacets;
		/** Whether to name the layer, which a list grouped by layer leaves out. */
		layer?: boolean;
	} = $props();

	const status = $derived(stack_facets.statuses.find((s) => s.id === facets.status));
	const languages = $derived(
		facets.languages.map((id) => stack_facets.languages.find((l) => l.id === id)?.label ?? id)
	);
</script>

<small>
	{#if layer}<span class="text_70">{facets.layer} ·</span>{/if}
	<span title={status?.description}>{status?.label ?? facets.status}</span>
	{#if languages.length > 0}<span class="text_70">· {languages.join(', ')}</span>{/if}
	{#if facets.site}
		<span class="text_70">·</span>
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a href={facets.site}>{new URL(facets.site).host}</a>
	{/if}
</small>
