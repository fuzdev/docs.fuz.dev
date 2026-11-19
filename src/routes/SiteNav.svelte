<script lang="ts">
	/**
	 * The site's sidebar nav: each section of `site_sections` with its emoji,
	 * the skills and tools always listed under theirs, and, under the current
	 * page, a skill's references or a single page's sections, which wide
	 * screens show in the page's own column instead.
	 *
	 * @module
	 */

	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import MenuLink from '@fuzdev/fuz_ui/MenuLink.svelte';
	import { href_contains_current_page } from '@fuzdev/fuz_ui/page_helpers.ts';

	import { coherence_sections } from './coherence/coherence_sections.ts';
	import { site_sections, type SiteSectionName } from './site_sections.ts';
	import { skills } from './skills/skills_manifest.ts';
	import { tools } from './tools/tools_manifest.ts';
	import { values_sections } from './values/values_sections.ts';

	// the single pages that list their own sections
	const page_sections: Partial<Record<SiteSectionName, Record<string, string>>> = {
		coherence: coherence_sections,
		values: values_sections
	};
</script>

<nav aria-label="site" class="p_md">
	<ul class="unstyled">
		{#each site_sections as section (section.name)}
			{@const section_href = resolve(`/${section.name}`)}
			{@const sections = page_sections[section.name]}
			<li>
				<!-- a section with pages of its own is selected only on its index -->
				<MenuLink
					class="menuitem"
					href={section_href}
					exact={section.name === 'skills' || section.name === 'tools'}
				>
					{section.icon}
					{section.name}
				</MenuLink>
				{#if section.name === 'skills'}
					<ul class="unstyled sub">
						{#each skills as skill (skill.name)}
							{@const skill_href = resolve(`/skills/${skill.name}`)}
							<li>
								<MenuLink class="menuitem" href={skill_href} exact>{skill.name}</MenuLink>
								{#if skill.references.length > 0 &&
									href_contains_current_page(skill_href, page.url)
								}
									<ul class="unstyled sub">
										{#each skill.references as ref (ref.slug)}
											<li>
												<MenuLink class="menuitem" href={resolve(ref.path)}>
													{ref.title}
												</MenuLink>
											</li>
										{/each}
									</ul>
								{/if}
							</li>
						{/each}
					</ul>
				{:else if section.name === 'tools'}
					<ul class="unstyled sub">
						{#each tools as tool (tool.name)}
							<li>
								<MenuLink class="menuitem" href={resolve(`/tools/${tool.name}`)}>
									{tool.name}
								</MenuLink>
							</li>
						{/each}
					</ul>
				{:else if sections && href_contains_current_page(section_href, page.url)}
					<ul class="unstyled sub narrow-only">
						{#each Object.entries(sections) as [id, title] (id)}
							<li>
								<a
									class={['menuitem', { selected: id === page.url.hash.slice(1) }]}
									href="{section_href}#{id}"
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

<style>
	/* a sub-item sits under its section's label, past the emoji */
	.sub {
		padding-left: var(--space_xl4);
	}
	.narrow-only {
		display: none;
	}
	/* the page's own column shows these on wide screens: sync with `PageSections` */
	@media (max-width: 1000px) {
		.narrow-only {
			display: block;
		}
	}
</style>
