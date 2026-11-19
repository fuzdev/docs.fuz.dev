/**
 * The projects the site's data pages may name, which are the ones the Fuz
 * stack page announces, each with the repos its links may point at.
 * `evidence_check.task.ts` holds every entry to that page.
 *
 * @module
 */

/** The GitHub owner of every repo the data pages may link. */
export const STACK_OWNER = 'fuzdev';

/** One project of the stack, as this site refers to it. */
export interface StackProject {
	/** The name the stack page gives it, which is what the data pages write. */
	name: string;
	/** Its repo on GitHub, first, and then the repo of its site when that is a separate one. */
	repos: ReadonlyArray<string>;
	/** The routes of this site that render the project, for the one project this site is. */
	routes?: ReadonlyArray<string>;
	/**
	 * npm packages of the project that another stack repo depends on and that no
	 * committed manifest names, since each is built into an ignored directory. The
	 * snapshot task maps a dependency on one to the project, and fails on a name under
	 * the stack's scope that is neither here nor a published root package.
	 */
	packages?: ReadonlyArray<string>;
}

/** In the stack page's order. */
export const stack_projects = [
	{ name: 'fuz_template', repos: ['fuz_template'] },
	{ name: 'zzz', repos: ['zzz'] },
	{ name: 'zervo', repos: ['zervo'] },
	{ name: 'fuz_forge', repos: ['fuz_forge'] },
	{ name: 'fuz_app', repos: ['fuz_app'] },
	{ name: 'fuz', repos: ['fuz'] },
	{ name: 'fuz_css', repos: ['fuz_css'] },
	{ name: 'fuz_ui', repos: ['fuz_ui'] },
	{ name: 'fuz_code', repos: ['fuz_code'] },
	{ name: 'mdz', repos: ['mdz'] },
	{ name: 'fuz_blog', repos: ['fuz_blog'] },
	{ name: 'gro', repos: ['gro'] },
	{
		name: 'tsv',
		repos: ['tsv', 'tsv.fuz.dev'],
		packages: [
			'@fuzdev/tsv',
			'@fuzdev/tsv-wasm',
			'@fuzdev/tsv-format-wasm',
			'@fuzdev/tsv-parse-wasm'
		]
	},
	{ name: 'tsv-format', repos: ['vscode-extension-tsv-format'] },
	{ name: 'svelte-docinfo', repos: ['svelte-docinfo'] },
	{ name: 'fuz_repos', repos: ['fuz_repos'] },
	{ name: 'fuz-stack', repos: ['docs.fuz.dev'], routes: ['/skills'] },
	{ name: 'corpora', repos: ['corpora'] },
	{ name: 'fuz_util', repos: ['fuz_util'] },
	{ name: 'fuz_schema', repos: ['fuz_schema'] },
	{ name: 'blake3', repos: ['blake3'], packages: ['@fuzdev/blake3-wasm'] },
	{ name: 'zap', repos: ['zap'] },
	{ name: 'pglet', repos: ['pglet'], packages: ['@fuzdev/pglet-wasm'] }
] as const satisfies ReadonlyArray<StackProject>;

/** A project's name. A record that is about one project is typed with it. */
export type StackProjectName = (typeof stack_projects)[number]['name'];

export const stack_project_names: ReadonlyArray<string> = stack_projects.map((p) => p.name);

/** Every repo a link on the data pages may name. */
export const stack_repos: ReadonlySet<string> = new Set(stack_projects.flatMap((p) => p.repos));
