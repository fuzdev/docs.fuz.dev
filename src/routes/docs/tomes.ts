import type { Tome } from '@fuzdev/fuz_ui/tome.ts';
import ApiPage from './api/+page.svelte';
import FuzStackPage from './fuz-stack/+page.svelte';
import GrimoirePage from './grimoire/+page.svelte';
import IntroductionPage from './introduction/+page.svelte';
import StackPage from './stack/+page.svelte';

export const tomes: Array<Tome> = [
	{
		slug: 'introduction',
		category: 'guide',
		Component: IntroductionPage,
		related_tomes: ['fuz-stack', 'grimoire', 'stack'],
		related_modules: [],
		related_declarations: []
	},
	{
		slug: 'fuz-stack',
		category: 'skills',
		Component: FuzStackPage,
		related_tomes: ['stack'],
		related_modules: [],
		related_declarations: []
	},
	{
		slug: 'grimoire',
		category: 'skills',
		Component: GrimoirePage,
		related_tomes: ['fuz-stack'],
		related_modules: [],
		related_declarations: []
	},
	{
		slug: 'stack',
		category: 'reference',
		Component: StackPage,
		related_tomes: ['api'],
		related_modules: [],
		related_declarations: []
	},
	{
		slug: 'api',
		category: 'reference',
		Component: ApiPage,
		related_tomes: ['stack'],
		related_modules: [],
		related_declarations: []
	}
];
