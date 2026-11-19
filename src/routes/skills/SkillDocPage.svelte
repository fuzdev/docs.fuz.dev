<script lang="ts">
	/**
	 * One skill document as a page: its title, the Markdown rendered with
	 * mdz, and a link to the source file.
	 *
	 * @module
	 */

	import Mdz from '@fuzdev/mdz/Mdz.svelte';
	import MdzRoot from '@fuzdev/mdz/MdzRoot.svelte';
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import { site_context } from '@fuzdev/fuz_ui/site.svelte.ts';

	import type { SkillDoc } from './skill_doc.ts';

	const {
		doc,
		skill,
		base
	}: {
		doc: SkillDoc;
		/** The skill's name. */
		skill: string;
		/** The route the document's relative links resolve against. */
		base: string;
	} = $props();

	const site = site_context.get();
</script>

<svelte:head>
	<title>{doc.title} - {skill} - docs.fuz.dev</title>
</svelte:head>

<MdzRoot codeblock={Code}>
	<Mdz content={doc.content} {base} />
</MdzRoot>

<footer class="mt_xl5">
	<small>
		source:
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a href="{site.repo_url}/blob/main/{doc.source}">{doc.source}</a>
	</small>
</footer>
