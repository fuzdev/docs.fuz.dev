<script lang="ts">
	/**
	 * A table of dependency edges seen from one end: the consumers of a
	 * project, or what a project consumes. An edge that a project's second
	 * repo declares, such as its site's, names that repo.
	 *
	 * @module
	 */

	import { resolve } from '$app/paths';

	import { dep_kind_labels, type StackDepEdge } from './stack_snapshot.ts';

	const {
		edges,
		side
	}: {
		edges: Array<StackDepEdge>;
		/** Which end of each edge the rows list: its consumer, or what is consumed. */
		side: 'from' | 'to';
	} = $props();
</script>

<div class="overflow-x:auto">
	<table>
		<thead>
			<tr>
				<th scope="col">{side === 'from' ? 'Used by' : 'Uses'}</th>
				<th scope="col">Kind</th>
				<th scope="col">Declared in</th>
				<th scope="col">Through</th>
			</tr>
		</thead>
		<tbody>
			{#each edges as edge (`${edge.from_repo}|${edge.to}|${edge.manifest}`)}
				{@const other = side === 'from' ? edge.from : edge.to}
				<tr>
					<th scope="row" class="text-align:left">
						<a href={resolve('/projects/[name]', { name: other })}>{other}</a>
						{#if edge.from_repo !== edge.from}
							<small class="text_70">
								({side === 'from' ? edge.from_repo : `declared by ${edge.from_repo}`})
							</small>
						{/if}
					</th>
					<td title={dep_kind_labels[edge.kind].meaning}>{dep_kind_labels[edge.kind].label}</td>
					<td>
						{edge.manifest === 'npm' ? 'package.json' : 'Cargo.toml'}{#if edge.source}
							<small class="text_70">({edge.source})</small>
						{/if}
					</td>
					<td><small>{edge.via.join(', ')}</small></td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
