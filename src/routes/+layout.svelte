<script lang="ts">
	import 'virtual:fuz.css';
	import '@fuzdev/fuz_code/theme.css';
	import './style.css';

	import ThemeRoot from '@fuzdev/fuz_ui/ThemeRoot.svelte';
	import AppShell from '@fuzdev/fuz_ui/AppShell.svelte';
	import Breadcrumb from '@fuzdev/fuz_ui/Breadcrumb.svelte';
	import { SidebarState } from '@fuzdev/fuz_ui/sidebar_state.svelte.ts';
	import { SiteState, site_context } from '@fuzdev/fuz_ui/site.svelte.ts';
	import { logo_docs_fuz_dev } from '@fuzdev/fuz_ui/logos.ts';
	import pkg_json from 'virtual:pkg.json';
	import type { Snippet } from 'svelte';

	import SiteNav from './SiteNav.svelte';

	const {
		children
	}: {
		children: Snippet;
	} = $props();

	// `glyph` and `repo_url` derive from `pkg_json`; `icon` stays explicit (structured `SvgData`).
	site_context.set(new SiteState({ icon: logo_docs_fuz_dev, pkg_json }));

	// named so the header's menu button can carry `aria-controls`
	const sidebar_state = new SidebarState({ id: 'site-nav' });
</script>

<svelte:head>
	<title>docs.fuz.dev</title>
</svelte:head>

<ThemeRoot>
	<AppShell
		class="site-shell"
		{sidebar_state}
		sidebar_width="280px"
		sidebar_label="site menu"
		show_toggle={false}
	>
		{#snippet sidebar()}
			<SiteNav />
		{/snippet}
		<header class="site-header">
			<nav aria-label="breadcrumb">
				<Breadcrumb />
			</nav>
			<button
				class="menu-toggle plain"
				type="button"
				aria-expanded={sidebar_state.show_narrow}
				aria-controls={sidebar_state.id}
				onclick={() => sidebar_state.toggle()}
			>
				menu
			</button>
		</header>
		<main class="site-main">
			{@render children()}
		</main>
	</AppShell>
</ThemeRoot>

<style>
	:global(.site-shell.app-shell) {
		/* the wide sidebar sits below the header */
		--sidebar_top: var(--site_header_height);
	}
	/* on `html` so the scroll padding can read it; an anchor jump lands with its target clear of the sticky header */
	:global(html:has(.site-shell)) {
		--site_header_height: 52px;
		scroll-padding-top: calc(var(--site_header_height) + var(--space_lg));
	}
	.site-header {
		position: sticky;
		top: 0;
		z-index: 10;
		height: var(--site_header_height);
		/* spans the sidebar's column too */
		margin-left: calc(-1 * var(--sidebar_offset, 0px));
		padding-left: var(--space_md);
		display: flex;
		align-items: center;
		justify-content: space-between;
		background-color: var(--shade_00);
		border-bottom: var(--border_width) solid var(--border_color);
	}
	.menu-toggle {
		display: none;
		height: 100%;
		border-radius: 0;
	}
	.site-main {
		padding: var(--space_lg) var(--space_xl) var(--space_xl7);
	}
	/* sync with `SIDEBAR_NARROW_QUERY_DEFAULT` */
	@media (max-width: 800px) {
		.menu-toggle {
			display: inline-flex;
		}
		.site-main {
			padding: var(--space_lg) var(--space_md) var(--space_xl7);
		}
	}
</style>
