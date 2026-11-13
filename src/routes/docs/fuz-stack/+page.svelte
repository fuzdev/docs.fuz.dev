<script lang="ts">
	import { resolve } from '$app/paths';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import { tome_get_by_slug } from '@fuzdev/fuz_ui/tome.ts';

	import { skills } from '#routes/skills/skills_manifest.ts';

	const tome = tome_get_by_slug('fuz-stack');

	const fuz_stack = skills.find((s) => s.name === 'fuz-stack')!;

	const skill_href = resolve('/skills/fuz-stack' as any);
</script>

<TomeContent {tome}>
	<TomeSection>
		<TomeSectionHeader text="Overview" />
		<p>
			Coding conventions and patterns for the <code>@fuzdev</code> TypeScript, Svelte 5, and Rust
			ecosystem, written so an agent can learn a rule once and apply it in every repo.
		</p>
		<p>
			The <a href={skill_href}>fuz-stack skill</a> is the full text: shared rules, a TypeScript and
			Svelte part, and a Rust part. This page only points at it.
		</p>
		<p>
			This content is AI-generated and mostly poorly reviewed. Not all patterns described here are
			endorsed, and some may be out of date or incorrect.
		</p>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="References" />
		<p>The skill's reference documents, each read when its task comes up:</p>
		<table>
			<thead>
				<tr>
					<th>Reference</th>
					<th>Covers</th>
				</tr>
			</thead>
			<tbody>
				{#each fuz_stack.references as ref (ref.slug)}
					<tr>
						<td>
							<a href={resolve(('/skills/fuz-stack/references/' + ref.slug) as any)}>{ref.title}</a>
						</td>
						<td>{ref.description}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Related" />
		<p>
			See <TomeLink slug="stack" /> for the packages and their dependency graph, and
			<TomeLink slug="grimoire" /> for cross-repo coordination: planning, TODOs, and multi-repo
			goals.
		</p>
	</TomeSection>
</TomeContent>
