<script lang="ts">
	import { resolve } from '$app/paths';
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import { tome_get_by_slug } from '@fuzdev/fuz_ui/tome.ts';

	import { skills } from '#routes/skills/skills_manifest.ts';

	const tome = tome_get_by_slug('fuz-stack');

	const fuz_stack = skills.find((s) => s.name === 'fuz-stack')!;
</script>

<TomeContent {tome}>
	<TomeSection>
		<TomeSectionHeader text="Overview" />
		<p>
			Coding conventions and patterns for the <code>@fuzdev</code> TypeScript, Svelte 5, and Rust
			ecosystem. These conventions keep agent-assisted development consistent across ~20 repos —
			from naming and file organization to error handling, testing, and validation patterns.
		</p>
		<p>
			This content is AI-generated and mostly poorly reviewed. Not all patterns described here are
			endorsed, and some may be out of date or incorrect.
		</p>
		<p>
			The full skill documentation is at
			<a href={resolve('/skills/fuz-stack' as any)}><code>skills/fuz-stack</code></a>.
		</p>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Conventions" />
		<table>
			<thead>
				<tr>
					<th>Area</th>
					<th>Convention</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Naming</td>
					<td>
						snake_case functions/variables, PascalCase types/components, SCREAMING_SNAKE_CASE
						constants
					</td>
				</tr>
				<tr>
					<td>File organization</td>
					<td>
						<code>src/lib/</code> for library code, <code>src/test/</code> for tests (not
						co-located), <code>src/routes/</code> for SvelteKit
					</td>
				</tr>
				<tr>
					<td>Imports</td>
					<td>
						Import by real source extension (<code>.ts</code>/<code>.svelte.ts</code>), directly
						from source (no barrels/re-exports)
					</td>
				</tr>
				<tr>
					<td>Formatting</td>
					<td><code>tsv</code> with tabs, 100 char width</td>
				</tr>
				<tr>
					<td>Breaking changes</td>
					<td>Acceptable — delete unused code, don't shim or alias</td>
				</tr>
				<tr>
					<td>Flat namespace</td>
					<td>
						All exported identifiers unique across all modules; the <code>svelte-docinfo</code>
						analysis enforces it
					</td>
				</tr>
				<tr>
					<td>Build</td>
					<td>
						<code>gro check</code> runs typecheck + test + gen --check + format --check + lint
					</td>
				</tr>
			</tbody>
		</table>
		<Code
			lang="ts"
			content={`// snake_case functions — domain-prefix when bare name would be ambiguous
function git_push() {}  // git_* cluster, "push" alone is ambiguous
function truncate() {}  // action-first, self-descriptive

// PascalCase types and components
type PackageJson = {};
// file: DocsLink.svelte

// real source extension in imports (.ts, not the old .js form)
import {git_push} from './git.ts';`}
		/>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="Core patterns" />
		<p>
			Beyond surface conventions, several deeper patterns define how <code>@fuzdev</code> code is
			structured:
		</p>
		<table>
			<thead>
				<tr>
					<th>Pattern</th>
					<th>Convention</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Error handling</td>
					<td>
						<code>Result&lt;TValue, TError&gt;</code> discriminated union — never throw for expected
						errors
					</td>
				</tr>
				<tr>
					<td>Dependency injection</td>
					<td>
						Small <code>*Deps</code> interfaces for all I/O, plain object mocks — no mocking
						libraries
					</td>
				</tr>
				<tr>
					<td>Validation</td>
					<td>
						<code>object()</code> by default, PascalCase schema naming, <code>brand()</code> for
						nominal types
					</td>
				</tr>
				<tr>
					<td>Testing</td>
					<td>
						Fixture-based testing for parsers — input files, generated <code>expected.json</code>,
						never manually edit
					</td>
				</tr>
			</tbody>
		</table>
		<Code
			lang="ts"
			content={`// Result pattern — properties directly on the result object
function parse_config(text: string): Result<{value: Config}, {error: ParseError}> {
\treturn {ok: true, value: JSON.parse(text)};
}

// Deps pattern — small interfaces, no god types
export interface FsDeps {
\tread_file: (path: string) => Promise<string>;
\twrite_file: (path: string, content: string) => Promise<void>;
}`}
		/>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="References" />
		<p>{fuz_stack.references.length} detailed reference documents:</p>
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
		<TomeSectionHeader text="Stack" />
		<pre>fuz_util → gro + fuz_css → mdz → fuz_ui → fuz_app → zzz, apps</pre>
		<p>
			<code>gro</code> is the durable web-dev workflow surface — its internals progressively adopt
			Rust (<code>tsv</code>, then <code>fuz</code> crates) while it stays complementary to
			<code>fuz</code> and <code>zap</code>. See <TomeLink slug="stack" /> for the full dependency
			graph and package details.
		</p>
		<p>
			For cross-repo coordination patterns — planning, TODOs, and multi-repo goals — see
			<TomeLink slug="grimoire" />.
		</p>
	</TomeSection>
</TomeContent>
