<script lang="ts">
	/**
	 * The probes of a row, folded: what a file, check script or CI step must
	 * show for the row to stand.
	 *
	 * @module
	 */

	import type { Probe } from '#routes/probe.ts';

	const { probes }: { probes: Array<Probe> } = $props();
</script>

{#if probes.length > 0}
	<details>
		<summary>
			<small>{probes.length} {probes.length === 1 ? 'probe' : 'probes'}</small>
		</summary>
		<ul class="probes">
			{#each probes as probe, index (index)}
				<li>
					<small>
						{#if probe.kind === 'file'}
							<code>{probe.repo}/{probe.path}</code>
							{#if probe.has === undefined}exists{:else}has <code>{probe.has}</code>{/if}
						{:else}
							{probe.kind === 'check_script'
								? `the check script of ${probe.repo}`
								: probe.file === undefined
									? `the CI steps of ${probe.repo}`
									: `the steps of ${probe.file} in ${probe.repo}`}
							{#if probe.has === undefined}
								{probe.kind === 'check_script' ? 'lacks' : 'lack'} <code>{probe.lacks}</code>
							{:else}
								{probe.kind === 'check_script' ? 'has' : 'have'} <code>{probe.has}</code>
							{/if}
						{/if}
					</small>
				</li>
			{/each}
		</ul>
	</details>
{/if}

<style>
	/* a probe's string is read whole, so it wraps and never widens its cell */
	.probes code {
		overflow-wrap: anywhere;
	}
</style>
