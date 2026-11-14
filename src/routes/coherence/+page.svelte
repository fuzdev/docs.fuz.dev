<script lang="ts">
	import { onMount } from 'svelte';
	import Mdz from '@fuzdev/mdz/Mdz.svelte';
	import Breadcrumb from '@fuzdev/fuz_ui/Breadcrumb.svelte';
	import DocsFooter from '@fuzdev/fuz_ui/DocsFooter.svelte';
	import { site_context } from '@fuzdev/fuz_ui/site.svelte.ts';
	import { FUZ_DEV_URL, MAIN_HEADER_MARGIN_TOP } from '@fuzdev/fuz_ui/constants.ts';

	import {
		oracle_comparisons,
		practice_rungs,
		practice_statuses,
		practices,
		practices_relate,
		type Practice,
		type PracticeStatusId
	} from './practices.ts';

	const site = site_context.get();

	const practice_by_id = new Map(practices.map((p) => [p.id, p]));
	const status_by_id = new Map(practice_statuses.map((s) => [s.id, s]));
	const related_by_id = practices_relate(practices);

	/** How long a jump to a record ignores the scroll and hover events the jump itself causes. */
	const JUMP_SETTLE_MS = 300;
	/** Scroll offsets under this count as the top of the page, where nothing is selected. */
	const PAGE_TOP_SLACK = 8;

	// the record the reader is at, set by scrolling or by following a link to one
	let selected: string | null = $state.raw(null);
	// the practice under the pointer or focus on the ladder, shown in place of `selected`
	let previewed: string | null = $state.raw(null);
	const shown = $derived(previewed ?? selected);
	const shown_related = $derived(shown === null ? undefined : related_by_id.get(shown));

	let jumped_at = -Infinity;
	let follow_queued = false;

	// a record's anchor id is its practice id, so the DOM is the lookup
	const heading_of = (id: string): HTMLElement | null | undefined =>
		document.getElementById(id)?.querySelector('h3');

	const is_on_screen = (el: HTMLElement | null): boolean => {
		if (!el) return false;
		const rect = el.getBoundingClientRect();
		return rect.bottom > 0 && rect.top < window.innerHeight;
	};

	const jump = (id: string): void => {
		jumped_at = performance.now();
		previewed = null;
		selected = practice_by_id.has(id) ? id : null;
	};

	// a jump moves the sticky ladder under a still pointer, which is not a hover
	const preview = (id: string): void => {
		if (performance.now() - jumped_at < JUMP_SETTLE_MS) return;
		previewed = id;
	};

	/**
	 * Selects the topmost record whose heading is fully on screen. Going down, the next
	 * record takes over as soon as the current heading starts to leave the top. Going up,
	 * the previous one takes over once its heading is back in view, so the selection
	 * never moves to a record whose heading the reader can't see.
	 */
	const follow = (): void => {
		if (performance.now() - jumped_at < JUMP_SETTLE_MS) return;
		if (window.scrollY < PAGE_TOP_SLACK) {
			selected = null;
			return;
		}
		for (const p of practices) {
			const top = heading_of(p.id)?.getBoundingClientRect().top;
			if (top === undefined || top < -1) continue;
			if (top >= window.innerHeight) break;
			selected = p.id;
			return;
		}
		// no heading is on screen: hold the selection while its record is still showing
		if (selected !== null && is_on_screen(document.getElementById(selected))) return;
		selected = practices.findLast((p) => is_on_screen(document.getElementById(p.id)))?.id ?? null;
	};

	const queue_follow = (): void => {
		if (follow_queued) return;
		follow_queued = true;
		requestAnimationFrame(() => {
			follow_queued = false;
			follow();
		});
	};

	const jump_to_hash = (): void => {
		jump(decodeURIComponent(location.hash.slice(1)));
	};

	onMount(() => {
		if (location.hash.length > 1) jump_to_hash();
		else follow();
	});
</script>

<svelte:head>
	<title>keeping software coherent at agent speed - docs.fuz.dev</title>
</svelte:head>

<svelte:window onscroll={queue_follow} onresize={queue_follow} onhashchange={jump_to_hash} />

{#snippet status_shape(status: PracticeStatusId)}
	<svg class="status-shape" viewBox="0 0 12 12" aria-hidden="true">
		<circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.5" />
		{#if status === 'practised'}
			<circle cx="6" cy="6" r="5" fill="currentColor" />
		{:else if status === 'partial'}
			<path d="M6 1 A5 5 0 0 0 6 11 Z" fill="currentColor" />
		{/if}
	</svg>
{/snippet}

{#snippet status_mark(practice: Practice)}
	{@render status_shape(practice.status)}<span class="sr_only">
		{status_by_id.get(practice.status)!.label}:
	</span>
{/snippet}

{#snippet ladder_chip(practice: Practice)}
	<a
		href="#{practice.id}"
		class={[
			'chip',
			{
				palette_a: shown === practice.id,
				'opacity:75%':
					shown !== null && shown !== practice.id && !shown_related?.includes(practice.id)
			}
		]}
		aria-current={selected === practice.id ? 'true' : undefined}
		onclick={() => jump(practice.id)}
		onmouseenter={() => preview(practice.id)}
		onmouseleave={() => (previewed = null)}
		onfocus={() => preview(practice.id)}
		onblur={() => (previewed = null)}
	>
		{@render status_mark(practice)}
		{practice.name}
	</a>
{/snippet}

<main class="width_atmost_lg mx_auto px_lg pb_xl9">
	<header>
		<h1 style:margin-top={MAIN_HEADER_MARGIN_TOP}>Keeping software coherent at agent speed</h1>
		<div class="mb_lg"><Breadcrumb /></div>
		<p class="width_atmost_md">
			Agents write a growing share of the Fuz stack's code. These are the practices the stack relies
			on to keep that code coherent, sorted by what does the work: a person's judgment at the top,
			the shape of the system at the bottom.
		</p>
		<p class="width_atmost_md">
			<small>
				Claude Fable 5.2 generated this page from a
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href="{site.repo_url}/blob/main/src/routes/coherence/practices.ts">data file</a>. The
				maintainer has not yet reviewed its status marks or evidence links.
			</small>
		</p>
	</header>

	<section>
		<h2 id="practices">The practices</h2>
		<ul class="unstyled row_wrap gap_md mb_lg">
			{#each practice_statuses as status (status.id)}
				<li>
					<small>
						{@render status_shape(status.id)}
						<strong>{status.label}</strong>
						<span class="text_70">{status.meaning}</span>
					</small>
				</li>
			{/each}
		</ul>
	</section>

	<section class="practices">
		<nav class="ladder" aria-label="practices by rung">
			<ol class="unstyled column gap_md mb_lg">
				{#each practice_rungs as rung (rung.id)}
					<li>
						<div class="mb_xs">
							<strong>{rung.label}</strong>
							<small class="text_70">{rung.lives}</small>
						</div>
						<div class="column gap_xs align-items:flex-start">
							{#each practices.filter((p) => p.rung === rung.id) as practice (practice.id)}
								{@render ladder_chip(practice)}
							{/each}
						</div>
					</li>
				{/each}
			</ol>
			<p>
				<small class="text_70">
					Each rung costs more to set up and less to keep up than the one above it. A rule moves
					down a rung when its lower form is simpler than the rule.
				</small>
			</p>
		</nav>

		<div class="records">
			{#each practice_rungs as rung (rung.id)}
				<section>
					<h2 id="rung-{rung.id}">{rung.label}</h2>
					<p class="text_70">{rung.lives}</p>
					{#each practices.filter((p) => p.rung === rung.id) as practice (practice.id)}
						{@const status = status_by_id.get(practice.status)!}
						<article id={practice.id}>
							<h3>{practice.name}</h3>
							<dl>
								<dt>Status</dt>
								<dd>{@render status_shape(status.id)} {status.label}</dd>
								<dt>Practice</dt>
								<dd>{practice.practice}</dd>
								<dt>Catches</dt>
								<dd>{practice.catches}</dd>
								<dt>Costs</dt>
								<dd>{practice.costs}</dd>
								<dt>Fails</dt>
								<dd>{practice.fails}</dd>
								<dt>Evidence</dt>
								<dd>
									<ul class="unstyled">
										{#each practice.evidence as evidence (evidence)}
											<li><Mdz content={evidence} inline /></li>
										{/each}
									</ul>
								</dd>
								<dt>Related</dt>
								<dd>
									<div class="row_wrap gap_xs">
										{#each related_by_id.get(practice.id) ?? [] as id (id)}
											{@const related = practice_by_id.get(id)!}
											<a href="#{id}" class="chip" onclick={() => jump(id)}>
												{@render status_mark(related)}
												{related.name}
											</a>
										{/each}
									</div>
								</dd>
							</dl>
						</article>
					{/each}
				</section>
			{/each}
		</div>
	</section>

	<section>
		<h2 id="oracles-in-use">Oracles in use</h2>
		<p class="width_atmost_md">
			Each project below checks its output against an oracle: something that already has the right
			behaviour, such as a reference implementation, a conformance suite, or a twin built to match.
			A row names what the project compares itself against, how it makes the comparison, and when
			the comparison runs. A check that runs on every change catches more than one that runs before
			a release, so the last column says how much weight each row can bear. The practice itself is
			<a href="#oracles" onclick={() => jump('oracles')}>{practice_by_id.get('oracles')?.name}</a>.
		</p>
		<div class="overflow-x:auto">
			<table>
				<thead>
					<tr>
						<th scope="col">Project</th>
						<th scope="col">Compared against</th>
						<th scope="col">Kind</th>
						<th scope="col">How</th>
						<th scope="col">Runs</th>
					</tr>
				</thead>
				<tbody>
					{#each oracle_comparisons as comparison (comparison.project + comparison.against)}
						<tr>
							<th scope="row" class="text-align:left">{comparison.project}</th>
							<td>{comparison.against}</td>
							<td>{comparison.kind}</td>
							<td>{comparison.how}</td>
							<td>{comparison.runs}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="box">
		<DocsFooter repo_url={site.repo_url} root_url={FUZ_DEV_URL}>
			<div class="mb_xl5">
				<Breadcrumb />
			</div>
		</DocsFooter>
	</section>
</main>

<style>
	.practices {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space_xl3);
	}
	.records {
		min-width: 0;
	}
	article {
		padding: var(--space_lg) 0;
		border-top: var(--border_width) solid var(--border_color);
		/* a jump lands with the heading clear of the top edge */
		scroll-margin-top: var(--space_lg);
	}
	dl {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		gap: var(--space_xs) var(--space_lg);
		margin: 0;
	}
	dt {
		color: var(--text_70);
		font-size: var(--font_size_sm);
	}
	dd {
		margin: 0;
	}
	/* sized in em so the mark scales with the text it sits in */
	.status-shape {
		display: inline-block;
		width: 0.7em;
		height: 0.7em;
	}
	/* the ladder stays in view as the index once there is room beside the records */
	@media (min-width: 960px) {
		.practices {
			grid-template-columns: var(--distance_sm) minmax(0, 1fr);
			align-items: start;
		}
		.ladder {
			position: sticky;
			top: var(--space_lg);
			max-height: calc(100vh - 2 * var(--space_lg));
			overflow-y: auto;
		}
	}
</style>
