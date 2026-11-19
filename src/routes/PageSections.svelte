<script lang="ts">
	/**
	 * A single page with its sections listed in a sticky column beside it on
	 * wide screens; at or below 1000px the column hides and the site's sidebar
	 * lists the sections instead.
	 *
	 * @module
	 */

	import type { Snippet } from 'svelte';
	import { page } from '$app/state';

	const {
		sections,
		children
	}: {
		/** Each section's title by its heading's id, in page order. */
		sections: Record<string, string>;
		children: Snippet;
	} = $props();

	// selected by the URL's hash, so stale once the reader scrolls
	const hash = $derived(page.url.hash.slice(1));
</script>

<div class="page-sections">
	<div class="page">
		{@render children()}
	</div>
	<nav aria-label="on this page" class="sections-column">
		<h4 class="mb_sm">on this page</h4>
		<ul class="unstyled">
			{#each Object.entries(sections) as [id, title] (id)}
				<li><a class={['menuitem', { selected: id === hash }]} href="#{id}">{title}</a></li>
			{/each}
		</ul>
	</nav>
</div>

<style>
	.page-sections {
		display: flex;
		gap: var(--space_xl);
		align-items: flex-start;
	}
	.page {
		flex: 1;
		min-width: 0;
	}
	.sections-column {
		position: sticky;
		top: calc(var(--site_header_height, 0px) + var(--space_lg));
		flex-shrink: 0;
		width: 220px;
		max-height: calc(100svh - var(--site_header_height, 0px) - var(--space_lg));
		overflow: auto;
		scrollbar-width: thin;
	}
	/* the site's sidebar lists them instead: sync with `SiteNav` */
	@media (max-width: 1000px) {
		.sections-column {
			display: none;
		}
	}
</style>
