<script lang="ts">
	import type { Snippet } from 'svelte';

	import SidebarLayout from '#routes/SidebarLayout.svelte';

	const { children }: { children: Snippet } = $props();
</script>

<!-- the order grid and the decision tables need more room than a column of prose -->
<SidebarLayout wide>
	{@render children()}
</SidebarLayout>
