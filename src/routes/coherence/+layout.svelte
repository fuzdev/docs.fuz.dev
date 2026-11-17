<script lang="ts">
	import type { Snippet } from 'svelte';

	import PageSections from '#routes/PageSections.svelte';
	import { coherence_sections } from './coherence_sections.ts';

	const { children }: { children: Snippet } = $props();
</script>

<PageSections sections={coherence_sections}>
	{@render children()}
</PageSections>
