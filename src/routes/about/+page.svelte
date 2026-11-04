<script lang="ts">
	import LibrarySummary from '@fuzdev/fuz_ui/LibrarySummary.svelte';
	import { Library, library_context } from '@fuzdev/fuz_ui/library.svelte.ts';
	import DocsFooter from '@fuzdev/fuz_ui/DocsFooter.svelte';
	import { site_context } from '@fuzdev/fuz_ui/site.svelte.ts';
	import { FUZ_DEV_URL, MAIN_HEADER_MARGIN_TOP } from '@fuzdev/fuz_ui/constants.ts';
	import EcosystemLinksPanel from '@fuzdev/fuz_ui/EcosystemLinksPanel.svelte';
	import Breadcrumb from '@fuzdev/fuz_ui/Breadcrumb.svelte';

	import { library_json } from '#routes/library.ts';

	const library = new Library(library_json, '/docs.fuz.dev');
	library_context.set(() => library);
	const site = site_context.get();
</script>

<svelte:head>
	<title>about - docs.fuz.dev</title>
</svelte:head>

<main class="width_atmost_md pb_xl9">
	<section>
		<header class="box">
			<h1 class="mb_xl5" style:margin-top={MAIN_HEADER_MARGIN_TOP}>
				{library.repo_name}
			</h1>
		</header>
		<Breadcrumb />
	</section>
	<section class="box mb_lg">
		<div class="panel p_md width_atmost_md">
			<LibrarySummary {library} />
		</div>
	</section>
	<EcosystemLinksPanel />
	<section class="box">
		<DocsFooter repo_url={site.repo_url} root_url={FUZ_DEV_URL}>
			<div class="mb_xl5">
				<Breadcrumb />
			</div>
		</DocsFooter>
	</section>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin: 0 auto;
	}
	h1 {
		display: flex;
		align-items: baseline;
		text-align: center;
	}
</style>
