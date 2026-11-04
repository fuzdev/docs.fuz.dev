<script lang="ts" module>
	/** Camera state — pixels-per-world-unit plus screen translation (a `Viewport`). */
	interface Viewport {
		/** Pixels per world unit. */
		scale: number;
		/** Screen x-translation in CSS pixels. */
		tx: number;
		/** Screen y-translation in CSS pixels. */
		ty: number;
	}

	/** Project a world point to panel-local screen (CSS) pixels. */
	const world_to_screen = (
		viewport: Viewport,
		wx: number,
		wy: number
	): { sx: number; sy: number } => ({
		sx: wx * viewport.scale + viewport.tx,
		sy: wy * viewport.scale + viewport.ty
	});

	/** Inverse of `world_to_screen` — panel-local screen pixels to world coordinates. */
	const screen_to_world = (
		viewport: Viewport,
		sx: number,
		sy: number
	): { x: number; y: number } => ({
		x: (sx - viewport.tx) / viewport.scale,
		y: (sy - viewport.ty) / viewport.scale
	});

	/** A circular hit-test target with painter's-algorithm z-order. */
	interface HitTarget {
		id: string;
		/** World x. */
		x: number;
		/** World y. */
		y: number;
		/** Hit radius in world units. */
		r: number;
		/** Draw order — higher wins when multiple targets contain the point. */
		z: number;
	}

	/**
	 * Pick the topmost hit target containing the world point, or `null` if none.
	 * Ties on `z` resolve to the last entry (matches painter's-algorithm draw order).
	 */
	const pick_topmost = (
		targets: ReadonlyArray<HitTarget>,
		wx: number,
		wy: number
	): string | null => {
		let best: HitTarget | null = null;
		for (const t of targets) {
			const dx = wx - t.x;
			const dy = wy - t.y;
			if (dx * dx + dy * dy <= t.r * t.r) {
				if (!best || t.z >= best.z) best = t;
			}
		}
		return best?.id ?? null;
	};

	const MIN_SCALE = 0.2;
	const MAX_SCALE = 4;
	const STORAGE_KEY = 'docs.fuz.dev:stack_map';

	/** Radius in world units for a node with the given dependency fan-in. */
	const node_radius = (fan_in: number): number => 12 + Math.min(fan_in, 8) * 2;

	/**
	 * Category → fuz_css color token. Eight distinguishable hues from the design
	 * system's saturated mid-shade palette (`--palette_*_50`).
	 */
	const category_colors: Record<StackCategory, string> = {
		foundation: 'var(--palette_a_50)', // blue
		build: 'var(--palette_f_50)', // brown
		styling: 'var(--palette_g_50)', // pink
		ui: 'var(--palette_d_50)', // purple
		fullstack: 'var(--palette_i_50)', // cyan
		tooling: 'var(--palette_e_50)', // yellow
		app: 'var(--palette_b_50)', // green
		site: 'var(--palette_h_50)' // orange
	};

	/** Human-readable legend labels for each category, in display order. */
	const category_labels: Array<[StackCategory, string]> = [
		['app', 'apps'],
		['site', 'sites'],
		['fullstack', 'fullstack'],
		['ui', 'UI'],
		['styling', 'styling'],
		['build', 'build'],
		['tooling', 'tooling'],
		['foundation', 'foundation']
	];
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/env';

	import { stack_nodes, stack_edges } from './stack_graph.ts';
	import type { StackNode, StackEdge, StackCategory } from '#lib/stack_graph_types.ts';

	// Camera (`$state` not raw so in-place `.tx`/`.ty`/`.scale` mutations stay reactive).
	let camera: Viewport = $state({ scale: 1, tx: 0, ty: 0 });
	let show_dev = $state(false);
	let selected: string | null = $state(null);
	let hovered: string | null = $state(null);

	let svg_el: SVGSVGElement | undefined = $state.raw();
	// Panel size in CSS pixels, tracked so default framing can center the graph.
	let panel_w = $state(800);
	let panel_h = $state(600);

	// Plain (non-reactive) drag bookkeeping — only read inside handlers.
	let mode: 'idle' | 'pan' = 'idle';
	let drag_moved = false;
	let last_x = 0;
	let last_y = 0;

	// Index nodes by name for O(1) lookups during cone walks and rendering.
	const nodes_by_name = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const m = new Map<string, StackNode>();
		for (const n of stack_nodes) m.set(n.name, n);
		return m;
	});

	// Edges visible under the current `show_dev` filter (dev edges hidden by default).
	const visible_edges = $derived(
		show_dev ? stack_edges : stack_edges.filter((e) => e.kind !== 'dev')
	);

	// Hit targets in painter order (later nodes win ties), one per node.
	const hit_targets = $derived.by(() =>
		stack_nodes.map((n, i): HitTarget => ({
			id: n.name,
			x: n.x,
			y: n.y,
			r: node_radius(n.fan_in),
			z: i
		}))
	);

	// Direct-dependency counts using the same edge set the user currently sees.
	const dependents_count = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const m = new Map<string, number>();
		for (const e of visible_edges) m.set(e.to, (m.get(e.to) ?? 0) + 1);
		return m;
	});
	const dependency_count = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const m = new Map<string, number>();
		for (const e of visible_edges) m.set(e.from, (m.get(e.from) ?? 0) + 1);
		return m;
	});

	/**
	 * The dependency cone of the selected node: the node itself, every node that
	 * transitively depends on it (ancestors, walking `from` along edges into it),
	 * and everything it transitively depends on (descendants, walking `to` along
	 * edges out of it). Uses the visible edge set so the cone matches what's drawn.
	 */
	const cone = $derived.by((): Set<string> | null => {
		if (!selected || !nodes_by_name.has(selected)) return null;
		const out_edges = new Map<string, Array<string>>();
		const in_edges = new Map<string, Array<string>>();
		const push = (m: Map<string, Array<string>>, k: string, v: string): void => {
			const list = m.get(k);
			if (list) list.push(v);
			else m.set(k, [v]);
		};
		for (const e of visible_edges) {
			push(out_edges, e.from, e.to);
			push(in_edges, e.to, e.from);
		}
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const result = new Set<string>([selected]);
		const walk = (start: string, adjacency: Map<string, Array<string>>): void => {
			const stack: Array<string> = [start];
			while (stack.length > 0) {
				const cur = stack.pop()!;
				for (const next of adjacency.get(cur) ?? []) {
					if (!result.has(next)) {
						result.add(next);
						stack.push(next);
					}
				}
			}
		};
		walk(selected, out_edges); // descendants — what it depends on
		walk(selected, in_edges); // ancestors — what depends on it
		return result;
	});

	const node_is_dimmed = (name: string): boolean => cone !== null && !cone.has(name);
	const edge_is_dimmed = (edge: StackEdge): boolean =>
		cone !== null && !(cone.has(edge.from) && cone.has(edge.to));

	const hovered_node = $derived(hovered ? (nodes_by_name.get(hovered) ?? null) : null);
	const tooltip_pos = $derived(
		hovered_node ? world_to_screen(camera, hovered_node.x, hovered_node.y) : null
	);

	/** Axis-aligned bounding box of all node centers, padded by their radii. */
	const graph_bounds = $derived.by(() => {
		if (stack_nodes.length === 0) return null;
		let min_x = Infinity;
		let min_y = Infinity;
		let max_x = -Infinity;
		let max_y = -Infinity;
		for (const n of stack_nodes) {
			const r = node_radius(n.fan_in);
			min_x = Math.min(min_x, n.x - r);
			min_y = Math.min(min_y, n.y - r);
			max_x = Math.max(max_x, n.x + r);
			max_y = Math.max(max_y, n.y + r);
		}
		return { min_x, min_y, max_x, max_y };
	});

	/** A camera that fits the whole graph within the current panel with margin. */
	const framing_camera = (): Viewport => {
		const b = graph_bounds;
		if (!b) return { scale: 1, tx: panel_w / 2, ty: panel_h / 2 };
		const margin = 64;
		const w = Math.max(1, b.max_x - b.min_x);
		const h = Math.max(1, b.max_y - b.min_y);
		const scale = Math.min(
			MAX_SCALE,
			Math.max(MIN_SCALE, Math.min((panel_w - margin) / w, (panel_h - margin) / h))
		);
		const cx = (b.min_x + b.max_x) / 2;
		const cy = (b.min_y + b.max_y) / 2;
		return { scale, tx: panel_w / 2 - cx * scale, ty: panel_h / 2 - cy * scale };
	};

	const persist = (): void => {
		if (!browser) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ camera }));
		} catch {
			// ignore — quota or serialization failure is non-fatal
		}
	};

	const pan = (dx: number, dy: number): void => {
		camera.tx += dx;
		camera.ty += dy;
		persist();
	};

	/** Zoom toward a screen point (wheel), keeping the world point under the cursor fixed. */
	const zoom_at = (sx: number, sy: number, delta_y: number): void => {
		const next = Math.min(
			MAX_SCALE,
			Math.max(MIN_SCALE, camera.scale * Math.exp(-delta_y * 0.0015))
		);
		const world = screen_to_world(camera, sx, sy);
		camera.scale = next;
		camera.tx = sx - world.x * next;
		camera.ty = sy - world.y * next;
		persist();
	};

	const reset_view = (): void => {
		camera = framing_camera();
		selected = null;
		persist();
	};

	onMount(() => {
		// Track panel size for default framing and tooltip math.
		const rect = svg_el?.getBoundingClientRect();
		if (rect) {
			panel_w = rect.width;
			panel_h = rect.height;
		}
		// Restore a persisted camera, else frame the graph.
		let restored = false;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as { camera?: Partial<Viewport> };
				if (
					parsed.camera &&
					typeof parsed.camera.scale === 'number' &&
					typeof parsed.camera.tx === 'number' &&
					typeof parsed.camera.ty === 'number'
				) {
					camera = {
						scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, parsed.camera.scale)),
						tx: parsed.camera.tx,
						ty: parsed.camera.ty
					};
					restored = true;
				}
			}
		} catch {
			// ignore — corrupt or unavailable storage falls through to framing
		}
		if (!restored) camera = framing_camera();

		// Keep panel size in sync on resize so reset/tooltips stay accurate.
		if (svg_el && typeof ResizeObserver !== 'undefined') {
			const ro = new ResizeObserver((entries) => {
				const cr = entries[0]?.contentRect;
				if (cr) {
					panel_w = cr.width;
					panel_h = cr.height;
				}
			});
			ro.observe(svg_el);
			return () => {
				ro.disconnect();
			};
		}
		return undefined;
	});

	const local_point = (e: PointerEvent | WheelEvent): { x: number; y: number } => {
		const rect = svg_el?.getBoundingClientRect();
		return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
	};

	const onpointerdown = (e: PointerEvent): void => {
		if (e.button !== 0) return;
		drag_moved = false;
		mode = 'pan';
		last_x = e.clientX;
		last_y = e.clientY;
		svg_el?.setPointerCapture(e.pointerId);
	};

	const onpointermove = (e: PointerEvent): void => {
		if (mode === 'idle') return;
		const dx = e.clientX - last_x;
		const dy = e.clientY - last_y;
		if (dx !== 0 || dy !== 0) drag_moved = true;
		last_x = e.clientX;
		last_y = e.clientY;
		pan(dx, dy);
	};

	const onpointerup = (e: PointerEvent): void => {
		if (mode === 'idle') return;
		// A press without drag is a click → hit-test → select (null clears).
		if (!drag_moved) {
			const { x, y } = local_point(e);
			const world = screen_to_world(camera, x, y);
			selected = pick_topmost(hit_targets, world.x, world.y);
		}
		mode = 'idle';
		try {
			svg_el?.releasePointerCapture(e.pointerId);
		} catch {
			// pointer wasn't captured (capture lost) — nothing to release
		}
	};

	const onwheel = (e: WheelEvent): void => {
		e.preventDefault();
		const { x, y } = local_point(e);
		zoom_at(x, y, e.deltaY);
	};
</script>

<div class="stack-map panel">
	<svg
		bind:this={svg_el}
		class="canvas"
		role="application"
		aria-label="Stack dependency map — drag to pan, scroll to zoom, click a node to trace its dependencies"
		{onpointerdown}
		{onpointermove}
		{onpointerup}
		{onwheel}
	>
		<g transform="translate({camera.tx} {camera.ty}) scale({camera.scale})">
			<!-- edges first so nodes paint on top -->
			{#each visible_edges as edge (edge.from + '\0' + edge.to + '\0' + edge.kind)}
				{@const from = nodes_by_name.get(edge.from)}
				{@const to = nodes_by_name.get(edge.to)}
				{#if from && to}
					<line
						class={['edge', { dimmed: edge_is_dimmed(edge) }]}
						x1={from.x}
						y1={from.y}
						x2={to.x}
						y2={to.y}
					/>
				{/if}
			{/each}

			{#each stack_nodes as node (node.name)}
				{@const r = node_radius(node.fan_in)}
				<g
					class={[
						'node',
						`cat-${node.category}`,
						{ selected: selected === node.name, dimmed: node_is_dimmed(node.name) }
					]}
					transform="translate({node.x} {node.y})"
					onpointerenter={() => (hovered = node.name)}
					onpointerleave={() => {
						if (hovered === node.name) hovered = null;
					}}
					role="presentation"
				>
					<circle
						class="disc lang-{node.language}"
						{r}
						style:fill={category_colors[node.category]}
					/>
					{#if node.language !== 'ts'}
						<text class="badge" text-anchor="middle" dominant-baseline="central" y={-r - 6}>
							{node.language}
						</text>
					{/if}
					<text class="label" y={r + 14} text-anchor="middle">{node.name}</text>
				</g>
			{/each}
		</g>
	</svg>

	{#if hovered_node && tooltip_pos}
		<div
			class="tooltip panel p_sm"
			style:left="{tooltip_pos.sx}px"
			style:top="{tooltip_pos.sy + node_radius(hovered_node.fan_in) * camera.scale + 8}px"
		>
			<strong>{hovered_node.name}</strong>
			<p class="description">{hovered_node.description}</p>
			<small>
				depended on by {dependents_count.get(hovered_node.name) ?? 0} · depends on
				{dependency_count.get(hovered_node.name) ?? 0}
			</small>
		</div>
	{/if}

	<div class="controls panel p_sm gap_sm column">
		<div class="row gap_sm">
			<button type="button" onclick={reset_view}>reset view</button>
			<label class="row gap_xs2 inline">
				<input type="checkbox" bind:checked={show_dev} />
				<span>show dev dependencies</span>
			</label>
		</div>
		<div class="legend row wrap gap_sm">
			{#each category_labels as [category, label] (category)}
				<span class="legend-item row gap_xs2">
					<span class="swatch" style:background={category_colors[category]}></span>
					<small>{label}</small>
				</span>
			{/each}
		</div>
		<small class="help">
			drag to pan · scroll to zoom · click a node to trace its dependencies
		</small>
	</div>
</div>

<style>
	.stack-map {
		position: relative;
		width: 100%;
		height: 70vh;
		min-height: 24rem;
		overflow: hidden;
		padding: 0;
	}
	.canvas {
		width: 100%;
		height: 100%;
		display: block;
		cursor: grab;
		touch-action: none;
	}
	.canvas:active {
		cursor: grabbing;
	}
	.edge {
		stroke: var(--border_color);
		stroke-width: 1.5;
		opacity: 0.5;
		transition: opacity 0.12s ease;
	}
	.edge.dimmed {
		opacity: 0.08;
	}
	.node {
		cursor: pointer;
		transition: opacity 0.12s ease;
	}
	.node.dimmed {
		opacity: 0.2;
	}
	.disc {
		stroke: var(--shade_00);
		stroke-width: 2;
	}
	/* non-ts languages get a distinct ring */
	.disc.lang-wasm,
	.disc.lang-rust {
		stroke: var(--text_color);
		stroke-dasharray: 3 2;
	}
	.node.selected .disc {
		stroke: var(--text_color);
		stroke-width: 3;
		stroke-dasharray: none;
	}
	.label {
		fill: var(--text_color);
		font-size: 12px;
		font-family: var(--font_family_mono);
		user-select: none;
		pointer-events: none;
	}
	.badge {
		fill: var(--text_color);
		font-size: 9px;
		font-family: var(--font_family_mono);
		text-transform: uppercase;
		user-select: none;
		pointer-events: none;
	}
	.tooltip {
		position: absolute;
		transform: translateX(-50%);
		max-width: 22rem;
		pointer-events: none;
		z-index: 2;
	}
	.tooltip .description {
		margin: var(--space_xs3) 0;
	}
	.controls {
		position: absolute;
		left: var(--space_md);
		bottom: var(--space_md);
		max-width: calc(100% - 2 * var(--space_md));
		z-index: 1;
	}
	.swatch {
		display: inline-block;
		width: 0.9rem;
		height: 0.9rem;
		border-radius: var(--border_radius_xs);
	}
	.help {
		opacity: 0.8;
	}
</style>
