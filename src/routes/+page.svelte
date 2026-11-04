<script lang="ts">
	import Svg from '@fuzdev/fuz_ui/Svg.svelte';
	import { logo_fuz } from '@fuzdev/fuz_ui/logos.ts';
	import { resolve } from '$app/paths';
	import DocsFooter from '@fuzdev/fuz_ui/DocsFooter.svelte';
	import { site_context } from '@fuzdev/fuz_ui/site.svelte.ts';
	import { FUZ_DEV_URL, MAIN_HEADER_MARGIN_TOP } from '@fuzdev/fuz_ui/constants.ts';
	import ProjectLinks from '@fuzdev/fuz_ui/ProjectLinks.svelte';
	import Card from '@fuzdev/fuz_ui/Card.svelte';
	import { DOCS_PATH } from '@fuzdev/fuz_ui/docs_helpers.svelte.ts';

	const site = site_context.get();
</script>

<main class="box width:100%">
	<div class="box width_atmost_md mb_xl9">
		<section class="box">
			<h1 class="mb_sm" style:margin-top={MAIN_HEADER_MARGIN_TOP}>docs.fuz.dev</h1>
			<div class="box mb_lg"><Svg data={logo_fuz} size="var(--icon_size_xl2)" /></div>
			<blockquote
				class="unstyled panel shade_05 shadow_bottom_sm py_sm px_xl mb_xl3 text-align:center"
			>
				experimental AI-generated<br />docs and skills for Fuz,<br />a zippy stack for human agency
			</blockquote>
			<div class="mb_lg p_xs2 shadow_md border_radius_sm">
				<div class="width_atmost_sm panel p_lg shadow_inset_xs shade_00">
					<p>
						docs.fuz.dev is an AI-generated site with docs and
						<a href="https://agentskills.io/">agent skills</a> for the
						<a href="https://www.fuz.dev/">Fuz</a> ecosystem, designed for both human and machine
						consumption.
					</p>
					<p>
						This website is inconsistently human-reviewed — everything is in flux, not all patterns
						are endorsed, and some content is plain slop. It's an actively evolving dumping ground
						of conventions, patterns, and reference material for
						<a href="https://github.com/fuzdev"><code>@fuzdev</code></a> projects.
					</p>
					<p>
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						For more see the <a href={resolve('/skills')}>skills</a> and generated
						<a href={resolve('/docs')}>docs</a>, and for human-written docs, visit the packages
						below.
					</p>
				</div>
			</div>
		</section>
		<section class="box gap_lg">
			<Card href={resolve('/skills')} icon="🧙">skills</Card>
			<Card href={DOCS_PATH} icon="📜">docs</Card>
			<Card href={resolve('/tools')} icon="🪄">tools</Card>
		</section>
		<section class="panel p_lg shadow_inset_xs">
			<ProjectLinks />
		</section>
		<section>
			<DocsFooter repo_url={site.repo_url} root_url={FUZ_DEV_URL}>
				{#snippet logo_header()}
					<a href={resolve('/about')} class="mb_xs">about</a>
				{/snippet}
			</DocsFooter>
		</section>
	</div>
</main>
