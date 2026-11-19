<script lang="ts">
	/**
	 * The site's sidebar nav: each section of `site_sections` with its emoji,
	 * the skills and tools always listed under theirs, and, under the current
	 * section, a skill's references, the coherence section's pages, or the
	 * projects the data names, the last two from a generated manifest so the
	 * layout does not load the data files. A page's
	 * own sections are listed too, which wide screens show in the page's own
	 * column instead.
	 *
	 * @module
	 */

	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import MenuLink from '@fuzdev/fuz_ui/MenuLink.svelte';
	import { href_contains_current_page } from '@fuzdev/fuz_ui/page_helpers.ts';

	import {
		nav_coherence_families,
		nav_coherence_tables,
		nav_projects
	} from './site_nav_manifest.ts';
	import { site_sections, type SiteSectionName } from './site_sections.ts';
	import { skills } from './skills/skills_manifest.ts';
	import { tools } from './tools/tools_manifest.ts';
	import { values_sections } from './values/values_sections.ts';

	// the single pages that list their own sections
	const page_sections: Partial<Record<SiteSectionName, Record<string, string>>> = {
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
					exact={section.name === 'skills' ||
						section.name === 'tools' ||
						section.name === 'coherence' ||
						section.name === 'projects'}
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
				{:else if section.name === 'coherence' &&
					href_contains_current_page(section_href, page.url)
				}
					<ul class="unstyled sub">
						{#each nav_coherence_families as family (family.path)}
							{@const family_href = resolve(family.path)}
							<li>
								<MenuLink class="menuitem" href={family_href}>{family.label}</MenuLink>
								{#if href_contains_current_page(family_href, page.url)}
									<ul class="unstyled sub narrow-only">
										{#each family.failures as failure (failure.id)}
											<li>
												<a
													class={['menuitem', { selected: failure.id === page.url.hash.slice(1) }]}
													href="{family_href}#{failure.id}"
												>
													{failure.name}
												</a>
											</li>
										{/each}
									</ul>
								{/if}
							</li>
						{/each}
						{#each nav_coherence_tables as table (table.path)}
							<li>
								<MenuLink class="menuitem" href={resolve(table.path)}>{table.title}</MenuLink>
							</li>
						{/each}
					</ul>
				{:else if section.name === 'projects' && href_contains_current_page(section_href, page.url)}
					<ul class="unstyled sub">
						{#each nav_projects as project (project.name)}
							{@const project_href = resolve('/projects/[name]', { name: project.name })}
							<li>
								<MenuLink class="menuitem" href={project_href}>{project.name}</MenuLink>
								{#if page.url.pathname === project_href}
									<ul class="unstyled sub narrow-only">
										{#each Object.entries(project.sections) as [id, title] (id)}
											<li>
												<a
													class={['menuitem', { selected: id === page.url.hash.slice(1) }]}
													href="{project_href}#{id}"
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
