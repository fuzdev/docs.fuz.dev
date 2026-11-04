<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Library, library_context } from '@fuzdev/fuz_ui/library.svelte.ts';

	import SidebarLayout from '#routes/SidebarLayout.svelte';
	import { library_json } from '#routes/library.ts';

	const { children }: { children: Snippet } = $props();

	// Skill docs render with `Mdz`, whose injected `DocsLink` resolves backticked
	// identifiers against `library_context` — so the `/skills` subtree provides its
	// own (this section loads the heavy analyzed `modules`; the landing doesn't).
	const library = new Library(library_json, '/docs.fuz.dev');
	library_context.set(() => library);
</script>

<SidebarLayout>
	{@render children()}
</SidebarLayout>
