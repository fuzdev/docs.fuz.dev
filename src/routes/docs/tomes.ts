import type { Component } from 'svelte';
import type { Tome } from '@fuzdev/fuz_ui/tome.ts';

import ApiPage from './api/+page.svelte';
import FuzStackPage from './fuz-stack/+page.svelte';
import GrimoirePage from './grimoire/+page.svelte';
import IntroductionPage from './introduction/+page.svelte';
import StackPage from './stack/+page.svelte';
import { tome_entries, type TomeSlug } from './tome_entries.ts';

const components: Record<TomeSlug, Component<any>> = {
	introduction: IntroductionPage,
	'fuz-stack': FuzStackPage,
	grimoire: GrimoirePage,
	stack: StackPage,
	api: ApiPage
};

export const tomes: Array<Tome> = tome_entries.map((entry) => ({
	...entry,
	related_tomes: [...entry.related_tomes],
	related_modules: [...entry.related_modules],
	related_declarations: [...entry.related_declarations],
	Component: components[entry.slug]
}));
