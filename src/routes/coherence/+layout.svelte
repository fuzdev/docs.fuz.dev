<script lang="ts">
	import type { Snippet } from 'svelte';

	import SidebarLayout from '#routes/SidebarLayout.svelte';

	const { children }: { children: Snippet } = $props();
</script>

<!-- the grid and the inventory tables need more room than a column of prose -->
<SidebarLayout wide>
	{@render children()}
</SidebarLayout>
