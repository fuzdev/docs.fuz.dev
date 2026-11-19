<script lang="ts">
	import { onMount } from 'svelte';
	import CopyToClipboard from '@fuzdev/fuz_ui/CopyToClipboard.svelte';
	import { hash_sha1, hash_sha256, hash_sha384, hash_sha512 } from '@fuzdev/fuz_util/hash.ts';
	import { to_hex } from '@fuzdev/fuz_util/hex.ts';

	import DataInput from '#lib/DataInput.svelte';

	type Algorithm = 'BLAKE3' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

	const algorithms: Array<Algorithm> = ['BLAKE3', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

	let data: Uint8Array | null = $state(null);
	let blake3_loaded = $state(false);

	let results = $state<Record<Algorithm, { hash: string; duration: number } | null>>({
		BLAKE3: null,
		'SHA-1': null,
		'SHA-256': null,
		'SHA-384': null,
		'SHA-512': null
	});

	// dynamically imported to avoid SSR — blake3_wasm is a top-level import in hash_blake3.ts
	let blake3_mod: typeof import('@fuzdev/fuz_util/hash_blake3.ts') | null = null;

	onMount(async () => {
		blake3_mod = await import('@fuzdev/fuz_util/hash_blake3.ts');
		await blake3_mod.blake3_ready;
		blake3_loaded = true;
	});

	const compute_hash = async (bytes: Uint8Array, algo: Algorithm): Promise<string> => {
		// cast needed: TS 5.9 Uint8Array<ArrayBufferLike> vs BufferSource's strict ArrayBuffer
		const buf = bytes as BufferSource;
		switch (algo) {
			case 'BLAKE3':
				return blake3_mod!.hash_blake3(buf);
			case 'SHA-1':
				return hash_sha1(buf);
			case 'SHA-256':
				return hash_sha256(buf);
			case 'SHA-384':
				return hash_sha384(buf);
			case 'SHA-512':
				return hash_sha512(buf);
		}
	};

	// hash empty input by default so the output is never blank
	const hash_data = $derived(data ?? new Uint8Array(0));

	$effect(() => {
		const current_data = hash_data;
		const current_blake3_loaded = blake3_loaded;

		// compute all algorithms in parallel, collect into a single assignment
		const promises = algorithms.map(async (algo) => {
			if (algo === 'BLAKE3' && !current_blake3_loaded) {
				return { algo, result: null };
			}
			const start = performance.now();
			const hash = await compute_hash(current_data, algo);
			const duration = performance.now() - start;
			return { algo, result: { hash, duration } };
		});

		void Promise.all(promises).then((entries) => {
			if (hash_data !== current_data) return;
			const next = {} as Record<Algorithm, { hash: string; duration: number } | null>;
			for (const { algo, result } of entries) {
				next[algo] = result;
			}
			results = next;
		});
	});
</script>

<svelte:head>
	<title>hash - tools - docs.fuz.dev</title>
</svelte:head>

<div>
	<h1>hash</h1>

	<DataInput bind:value={data} />

	<section class="gap_sm">
		<h2 class="mt_0">output</h2>
		{#each algorithms as algo (algo)}
			{@const result = results[algo]}
			<div class="mb_xl2">
				<div class="row gap_sm mb_xs">
					<strong style:width="7rem">{algo}</strong>
					{#if result}
						<small style:width="6rem">{result.hash.length * 4}-bit</small>
						<small style:width="6rem">
							{result.duration < 1 ? '<1' : result.duration.toFixed(1)}ms
						</small>
					{:else if algo === 'BLAKE3' && !blake3_loaded}
						<small>(loading)</small>
					{/if}
				</div>
				{#if result}
					<div class="row">
						<CopyToClipboard text={result.hash} />
						<div class="panel shadow_inset_xs p_md">
							<span class="hash_output">{result.hash}</span>
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</section>

	{#if data}
		<h3>raw bytes ({data.length})</h3>
		<div class="panel shadow_inset_xs p_md">
			<span class="hash_output">{to_hex(data)}</span>
		</div>
	{/if}
</div>

<style>
	.hash_output {
		word-break: break-all;
		font-size: var(--font_size_sm);
		font-family: var(--font_family_mono);
	}
</style>
