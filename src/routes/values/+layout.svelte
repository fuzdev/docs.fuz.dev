<script lang="ts">
	import type { Snippet } from 'svelte';

	import PageSections from '#routes/PageSections.svelte';
	import { values_sections } from './values_sections.ts';

	const { children }: { children: Snippet } = $props();
</script>

<PageSections sections={values_sections}>
	{@render children()}
</PageSections>
