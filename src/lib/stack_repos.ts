/**
 * Single source of truth for the public `@fuzdev` stack repos — reusable
 * metadata describing each repo's workspace directory, package name, editorial
 * category, and language. Consumed by the stack generators (`src/routes/stack.gen.ts`
 * and `src/routes/docs/stack/stack_graph.gen.ts`) so the repo list lives in one
 * place instead of drifting across separate hardcoded copies.
 *
 * Explicit allowlist, never globbed: a stray `private_*` clone in the workspace
 * must never leak into generated output. Personal sites like
 * `ryanatkn.com` are intentionally excluded — this is the `@fuzdev`
 * ecosystem stack, not every repo in the workspace. Cargo-only repos with no
 * `package.json` (tsv) are excluded until the generators support
 * manifest-less repos.
 *
 * @module
 */

import type { StackCategory, StackLanguage } from './stack_graph_types.ts';

/** One public stack repo, identified by its workspace directory name. */
export interface StackRepo {
	/** Directory name under the workspace root, e.g. `fuz_util`. */
	path: string;
	/** Canonical manifest/package name, e.g. `@fuzdev/fuz_util` (unscoped for `svelte-docinfo`). */
	name: string;
	/** Editorial grouping (not derivable from any manifest). */
	category: StackCategory;
	/** Primary language. `wasm`/`rust` repos build via Cargo, not `svelte-docinfo`. */
	language: StackLanguage;
}

/**
 * Public stack repos in rough dependency order. Order is cosmetic for the
 * dependency graph (its generator sorts), but sets the display order of the
 * generated `libraries.json` / `stack.json`.
 */
export const stack_repos: ReadonlyArray<StackRepo> = [
	{ path: 'fuz_util', name: '@fuzdev/fuz_util', category: 'foundation', language: 'ts' },
	{ path: 'gro', name: '@fuzdev/gro', category: 'build', language: 'ts' },
	{ path: 'fuz_css', name: '@fuzdev/fuz_css', category: 'styling', language: 'ts' },
	{ path: 'mdz', name: '@fuzdev/mdz', category: 'ui', language: 'ts' },
	{ path: 'fuz_ui', name: '@fuzdev/fuz_ui', category: 'ui', language: 'ts' },
	{ path: 'fuz_app', name: '@fuzdev/fuz_app', category: 'fullstack', language: 'ts' },
	{ path: 'fuz_code', name: '@fuzdev/fuz_code', category: 'ui', language: 'ts' },
	{ path: 'fuz_template', name: '@fuzdev/fuz_template', category: 'app', language: 'ts' },
	{ path: 'fuz_blog', name: '@fuzdev/fuz_blog', category: 'app', language: 'ts' },
	{ path: 'fuz_repos', name: '@fuzdev/fuz_repos', category: 'tooling', language: 'ts' },
	{ path: 'docs.fuz.dev', name: 'docs.fuz.dev', category: 'app', language: 'ts' },
	{ path: 'fuz.dev', name: '@fuzdev/fuz.dev', category: 'site', language: 'ts' },
	{ path: 'zzz', name: '@fuzdev/zzz', category: 'app', language: 'ts' },
	{ path: 'svelte-docinfo', name: 'svelte-docinfo', category: 'tooling', language: 'ts' },
	{ path: 'blake3', name: '@fuzdev/blake3', category: 'foundation', language: 'wasm' }
];
