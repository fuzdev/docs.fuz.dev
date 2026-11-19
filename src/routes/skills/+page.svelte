<script lang="ts">
	import { resolve } from '$app/paths';
	import { site_context } from '@fuzdev/fuz_ui/site.svelte.ts';

	import { skills } from './skills_manifest.ts';

	const site = site_context.get();
</script>

<svelte:head>
	<title>skills - docs.fuz.dev</title>
</svelte:head>

<h1>Skills</h1>
<p>
	<a href="https://agentskills.io/">Agent skills</a> for the Fuz ecosystem: Markdown that an agent
	loads when a task matches, rendered here with mdz so a person can read the same text. Where a
	skill and the code disagree, the code is right.
</p>
<ul>
	{#each skills as skill (skill.name)}
		<li>
			<a href={resolve(skill.path)}>{skill.name}</a> — {skill.title}
			{#if skill.references_path}
				<small>(<a href={resolve(skill.references_path)}>references</a>)</small>
			{/if}
		</li>
	{/each}
</ul>

<h2>Using a skill</h2>
<p>
	Each skill is a folder in this site's
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a href="{site.repo_url}/tree/main/skills">repo</a>, with a <code>SKILL.md</code> and, for
	fuz-stack, references it reads by task.
</p>
<ul>
	<li>
		<strong>Claude Code:</strong> copy the folder into <code>~/.claude/skills/</code>, so
		<code>~/.claude/skills/fuz-stack/SKILL.md</code> exists.
	</li>
	<li>
		<strong>Claude.ai:</strong> upload the folder at
		<a href="https://claude.ai/customize/skills">claude.ai/customize/skills</a>.
	</li>
	<li>
		<strong>Any agent:</strong> point it at a skill's <code>SKILL.md</code> in the repo.
	</li>
</ul>
