<script lang="ts">
	import { onNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import Breadcrumb from '@fuzdev/fuz_ui/Breadcrumb.svelte';
	import Dialog from '@fuzdev/fuz_ui/Dialog.svelte';
	import DialogContent from '@fuzdev/fuz_ui/DialogContent.svelte';

	import { coherence_sections } from './coherence/coherence_sections.ts';
	import { section_icons } from './site_sections.ts';
	import { skills } from './skills/skills_manifest.ts';
	import { tools } from './tools/tools_manifest.ts';
	import { values_sections } from './values/values_sections.ts';

	const {
		children,
		wide = false
	}: {
		children: Snippet;
		/** Lets the content use the full width beside the sidebar, for a page of tables. */
		wide?: boolean;
	} = $props();

	// the single pages that list their own sections as sub-items
	const section_pages = [
		{ name: 'coherence', sections: coherence_sections },
		{ name: 'values', sections: values_sections }
	] as const;

	const pathname = $derived(page.url.pathname);

	// narrow screens hide the sidebar (CSS) and show the nav in a dialog instead
	let show_nav_dialog = $state(false);

	onNavigate(() => {
		show_nav_dialog = false;
	});
</script>

{#snippet nav_list()}
	<nav>
		<ul class="unstyled">
			<li>
				<a class="menuitem" href={resolve('/docs')}>{section_icons.docs} docs</a>
			</li>
			<li>
				<a
					class={['menuitem', { selected: pathname === resolve('/skills') }]}
					href={resolve('/skills')}
				>
					{section_icons.skills} skills
				</a>
			</li>
			<!-- a sub-item is indented to sit under its section's label, past the emoji -->
			{#each skills as skill (skill.name)}
				{@const skill_path = resolve(('/skills/' + skill.name) as any)}
				{@const skill_active = pathname.startsWith(skill_path)}
				<li>
					<a class={['menuitem pl_xl4', { selected: pathname === skill_path }]} href={skill_path}>
						{skill.name}
					</a>
					{#if skill_active && skill.references.length > 0}
						<ul class="unstyled">
							{#each skill.references as ref (ref.slug)}
								<li>
									<a
										class={[
											'menuitem',
											{
												selected:
													pathname ===
													resolve(('/skills/' + skill.name + '/references/' + ref.slug) as any)
											}
										]}
										style:padding-left="calc(var(--space_xl4) + var(--space_lg))"
										href={resolve(('/skills/' + skill.name + '/references/' + ref.slug) as any)}
									>
										{ref.title}
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				</li>
			{/each}
			<li>
				<a
					class={['menuitem', { selected: pathname === resolve('/tools') }]}
					href={resolve('/tools')}
				>
					{section_icons.tools} tools
				</a>
			</li>
			{#each tools as tool (tool.name)}
				{@const tool_path = resolve(('/tools/' + tool.name) as any)}
				<li>
					<a class={['menuitem pl_xl4', { selected: pathname === tool_path }]} href={tool_path}>
						{tool.name}
					</a>
				</li>
			{/each}
			{#each section_pages as section_page (section_page.name)}
				{@const page_path = resolve(`/${section_page.name}`)}
				<li>
					<a class={['menuitem', { selected: pathname === page_path }]} href={page_path}>
						{section_icons[section_page.name]}
						{section_page.name}
					</a>
					{#if pathname === page_path}
						<ul class="unstyled">
							{#each Object.entries(section_page.sections) as [id, title] (id)}
								<li>
									<!-- a jump within the page is no navigation, so it closes the dialog itself -->
									<a
										class="menuitem pl_xl4"
										href="{page_path}#{id}"
										onclick={() => (show_nav_dialog = false)}
									>
										{title}
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				</li>
			{/each}
		</ul>
	</nav>
{/snippet}

<div class="sidebar_layout">
	<header class="primary_nav">
		<nav>
			<Breadcrumb />
		</nav>
		<button class="nav-dialog-toggle plain" type="button" onclick={() => (show_nav_dialog = true)}>
			menu
		</button>
	</header>
	<aside class="sidebar unstyled">
		{@render nav_list()}
	</aside>
	<div class="content">
		<div class={{ width_atmost_md: !wide }}>
			{@render children()}
		</div>
	</div>
</div>

{#if show_nav_dialog}
	<Dialog onclose={() => (show_nav_dialog = false)}>
		<DialogContent>
			{@render nav_list()}
		</DialogContent>
	</Dialog>
{/if}

<style>
	/* on the root so an anchor jump lands with its target clear of the sticky header */
	:global(html:has(.sidebar_layout)) {
		--primary_nav_height: 52px;
		scroll-padding-top: calc(var(--primary_nav_height) + var(--space_lg));
	}
	.sidebar_layout {
		--sidebar_width: 280px;
	}
	.primary_nav {
		position: sticky;
		top: 0;
		z-index: 10;
		height: var(--primary_nav_height);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-left: var(--space_md);
		background-color: var(--shade_00);
		border-bottom: var(--border_width) solid var(--border_color);
	}
	.sidebar {
		position: fixed;
		left: 0;
		top: var(--primary_nav_height);
		width: var(--sidebar_width);
		height: calc(100% - var(--primary_nav_height));
		overflow-y: auto;
		scrollbar-width: thin;
		background: var(--sidebar_bg, var(--shade_05));
		padding: var(--space_md);
	}
	.content {
		min-height: 100%;
		padding: var(--space_lg) var(--space_xl) var(--space_xl7)
			calc(var(--sidebar_width) + var(--space_xl));
	}
	.nav-dialog-toggle {
		display: none;
		height: 100%;
		border-radius: 0;
	}
	@media (max-width: 800px) {
		.sidebar {
			display: none;
		}
		.content {
			padding: var(--space_lg) var(--space_md) var(--space_xl7);
		}
		.nav-dialog-toggle {
			display: inline-flex;
		}
	}
</style>
