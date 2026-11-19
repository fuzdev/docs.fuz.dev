<script lang="ts">
	import Mdz from '@fuzdev/mdz/Mdz.svelte';
	import { site_context } from '@fuzdev/fuz_ui/site.svelte.ts';

	import PageSections from '#routes/PageSections.svelte';
	import {
		claims_checked,
		glossary_group_ids,
		glossary_group_terms,
		glossary_groups,
		intro,
		reviewed,
		written_by
	} from './glossary.ts';

	const site = site_context.get();
</script>

<svelte:head>
	<title>glossary - docs.fuz.dev</title>
</svelte:head>

<PageSections sections={glossary_groups}>
	<header>
		<h1>Glossary</h1>
		<p class="width_atmost_md">{intro}</p>
		<p class="width_atmost_md">
			<small>
				{written_by} wrote this page and its
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href="{site.repo_url}/blob/main/src/routes/glossary/glossary.ts">data file</a>. Its
				definitions were checked against their sources on
				<time datetime={claims_checked}>{claims_checked}</time>. The maintainer
				{reviewed ? 'has reviewed it' : 'has not yet reviewed it'}.
			</small>
		</p>
	</header>
	{#each glossary_group_ids as group_id (group_id)}
		<section>
			<h2 id={group_id}>{glossary_groups[group_id]}</h2>
			<dl>
				{#each glossary_group_terms(group_id) as term (term.id)}
					<dt id={term.id}><strong>{term.term}</strong></dt>
					<dd class="mb_lg">
						{term.definition}
						{#if term.also}
							<div><small class="text_70">{term.also}</small></div>
						{/if}
						<div>
							<small>
								{#if term.source}
									<Mdz content={term.source} inline />
								{:else}
									<span class="text_70">This site's own usage.</span>
								{/if}
							</small>
						</div>
					</dd>
				{/each}
			</dl>
		</section>
	{/each}
</PageSections>
