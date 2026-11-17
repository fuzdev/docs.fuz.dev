<script lang="ts">
	/**
	 * The site's sidebar nav: each section with its emoji, the skills and
	 * tools always, and, under the current page, the docs tomes (with the
	 * page's links on narrow screens), a skill's references, or a single
	 * page's sections, which wide screens show in the page's own column
	 * instead.
	 *
	 * @module
	 */

	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DocsMenu from '@fuzdev/fuz_ui/DocsMenu.svelte';
	import DocsPageLinks from '@fuzdev/fuz_ui/DocsPageLinks.svelte';
	import MenuLink from '@fuzdev/fuz_ui/MenuLink.svelte';
	import { href_contains_current_page } from '@fuzdev/fuz_ui/page_helpers.ts';

	import { coherence_sections } from './coherence/coherence_sections.ts';
	import { tome_entries } from './docs/tome_entries.ts';
	import { section_icons } from './site_sections.ts';
	import { skills } from './skills/skills_manifest.ts';
	import { tools } from './tools/tools_manifest.ts';
	import { values_sections } from './values/values_sections.ts';

	// the single pages that list their own sections
	const section_pages = [
		{ name: 'coherence', sections: coherence_sections },
		{ name: 'values', sections: values_sections }
	] as const;

	const docs_href = resolve('/docs');
	const in_docs = $derived(href_contains_current_page(docs_href, page.url));
</script>

<nav aria-label="site" class="p_md">
	<ul class="unstyled">
		<li>
			<MenuLink class="menuitem" href={docs_href} exact>{section_icons.docs} docs</MenuLink>
			{#if in_docs}
				<div class="sub">
					<DocsMenu tomes={tome_entries} />
				</div>
				<div class="narrow-only sub">
					<DocsPageLinks />
				</div>
			{/if}
		</li>
		<li>
			<MenuLink class="menuitem" href={resolve('/skills')} exact>
				{section_icons.skills} skills
			</MenuLink>
			<ul class="unstyled sub">
				{#each skills as skill (skill.name)}
					{@const skill_href = resolve(('/skills/' + skill.name) as any)}
					<li>
						<MenuLink class="menuitem" href={skill_href} exact>{skill.name}</MenuLink>
						{#if skill.references.length > 0 && href_contains_current_page(skill_href, page.url)}
							<ul class="unstyled sub">
								{#each skill.references as ref (ref.slug)}
									<li>
										<MenuLink
											class="menuitem"
											href={resolve(('/skills/' + skill.name + '/references/' + ref.slug) as any)}
										>
											{ref.title}
										</MenuLink>
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		</li>
		<li>
			<MenuLink class="menuitem" href={resolve('/tools')} exact>
				{section_icons.tools} tools
			</MenuLink>
			<ul class="unstyled sub">
				{#each tools as tool (tool.name)}
					<li>
						<MenuLink class="menuitem" href={resolve(('/tools/' + tool.name) as any)}>
							{tool.name}
						</MenuLink>
					</li>
				{/each}
			</ul>
		</li>
		{#each section_pages as section_page (section_page.name)}
			{@const page_href = resolve(`/${section_page.name}`)}
			<li>
				<MenuLink class="menuitem" href={page_href}>
					{section_icons[section_page.name]}
					{section_page.name}
				</MenuLink>
				{#if href_contains_current_page(page_href, page.url)}
					<ul class="unstyled sub narrow-only">
						{#each Object.entries(section_page.sections) as [id, title] (id)}
							<li>
								<a
									class={['menuitem', { selected: id === page.url.hash.slice(1) }]}
									href="{page_href}#{id}"
								>
									{title}
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</li>
		{/each}
		<li>
			<MenuLink class="menuitem" href={resolve('/about')}>{section_icons.about} about</MenuLink>
		</li>
	</ul>
</nav>

<style>
	/* a sub-item sits under its section's label, past the emoji */
	.sub {
		padding-left: var(--space_xl4);
		/* `DocsMenu` spaces its categories for a page of its own */
		--docs_menu_category_spacing: var(--space_md);
	}
	.narrow-only {
		display: none;
	}
	/* the page's own column shows these on wide screens: sync with `Docs` and `PageSections` */
	@media (max-width: 1000px) {
		.narrow-only {
			display: block;
		}
	}
</style>
