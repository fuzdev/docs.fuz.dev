<script lang="ts">
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import { tome_get_by_slug } from '@fuzdev/fuz_ui/tome.ts';

	import { stack } from '#routes/stack.ts';
	import { SvelteMap } from 'svelte/reactivity';

	import StackMap from './StackMap.svelte';

	const tome = tome_get_by_slug('stack');

	const packages = stack.libraries.filter((lib) => lib.kind === 'package');
	const crates = stack.libraries.filter((lib) => lib.kind === 'crate');

	const total_exports = packages.reduce((sum, pkg) => sum + pkg.export_count!, 0);
	const total_modules = packages.reduce((sum, pkg) => sum + pkg.module_count!, 0);
	const total_exported_modules = packages.reduce((sum, pkg) => sum + pkg.exported_module_count!, 0);

	// Group crates by workspace
	const crate_workspaces: Array<{ name: string; edition: string; crates: typeof crates }> = $state(
		[]
	);
	{
		const ws_map: Map<string, (typeof crate_workspaces)[number]> = new SvelteMap();
		for (const crate of crates) {
			const ws_name = crate.workspace!;
			if (!ws_map.has(ws_name)) {
				const ws = { name: ws_name, edition: crate.edition!, crates: [] as typeof crates };
				crate_workspaces.push(ws);
				ws_map.set(ws_name, ws);
			}
			ws_map.get(ws_name)!.crates.push(crate);
		}
	}
</script>

<TomeContent {tome}>
	<TomeSection>
		<TomeSectionHeader text="Dependency map" />
		<StackMap />
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Toolchain" />
		<div class="overflow-x:auto">
			<table>
				<thead>
					<tr>
						<th>Tool</th>
						<th>Version</th>
					</tr>
				</thead>
				<tbody>
					{#each Object.entries(stack.toolchain) as [tool, version] (tool)}
						<tr>
							<td>{tool}</td>
							<td><code>{version}</code></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="TypeScript and Svelte packages" />
		<p>
			{packages.length} packages, {total_exported_modules} exported modules ({total_modules} total),
			{total_exports} exports
		</p>
		<div class="overflow-x:auto">
			<table>
				<thead>
					<tr>
						<th>Package</th>
						<th>Version</th>
						<th>Description</th>
						<th>Modules</th>
						<th>Exports</th>
						<th>Published</th>
					</tr>
				</thead>
				<tbody>
					{#each packages as pkg (pkg.name)}
						<tr>
							<td>
								{pkg.glyph}
								{#if pkg.homepage_url}
									<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
									<a href={pkg.homepage_url}>{pkg.name}</a>
								{:else}
									{pkg.name}
								{/if}
							</td>
							<td><code>{pkg.version}</code></td>
							<td>{pkg.description}</td>
							<td>
								{#if pkg.exported_module_count! < pkg.module_count!}
									{pkg.exported_module_count}/{pkg.module_count}
								{:else}
									{pkg.module_count}
								{/if}
							</td>
							<td>{pkg.export_count}</td>
							<td>{pkg.published ? 'yes' : 'no'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</TomeSection>

	{#if crate_workspaces.length > 0}
		<TomeSection>
			<TomeSectionHeader text="Rust workspaces" />
			{#each crate_workspaces as workspace (workspace.name)}
				<h3>{workspace.name}</h3>
				<div class="overflow-x:auto">
					<table>
						<thead>
							<tr>
								<th>Crate</th>
								<th>Version</th>
								<th>Kind</th>
								<th>Description</th>
								<th>Deps</th>
							</tr>
						</thead>
						<tbody>
							{#each workspace.crates as crate (crate.name)}
								<tr>
									<td><code>{crate.name}</code></td>
									<td><code>{crate.version}</code></td>
									<td>{crate.crate_kind}</td>
									<td>{crate.description}</td>
									<td>{crate.internal_deps!.join(', ')}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/each}
		</TomeSection>
	{/if}
</TomeContent>
