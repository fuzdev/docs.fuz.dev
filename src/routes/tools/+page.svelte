<script lang="ts">
	import { resolve } from '$app/paths';

	import { tools } from './tools_manifest.ts';
</script>

<svelte:head>
	<title>tools - docs.fuz.dev</title>
</svelte:head>

<h1>Tools</h1>
<p>Small tools that run in the browser.</p>
<ul>
	{#each tools as tool (tool.name)}
		<li>
			<a href={resolve(`/tools/${tool.name}`)}>{tool.name}</a> — {tool.title}
		</li>
	{/each}
</ul>
