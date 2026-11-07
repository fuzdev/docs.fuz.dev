<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import { from_hex } from '@fuzdev/fuz_util/hex.ts';
	import { format_bytes } from '@fuzdev/fuz_util/bytes.ts';

	type InputMode = 'text' | 'file' | 'hex' | 'base64';

	const input_modes: Array<InputMode> = ['text', 'file', 'hex', 'base64'];

	let {
		// write-only bindable output, which the rule reads as unused
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		value = $bindable(null),
		input_mode = $bindable('text'),
		children,
		...rest
	}: SvelteHTMLElements['div'] & {
		/** The normalized binary output. `null` when input is empty or invalid. */
		value?: Uint8Array | null;
		/** The current input mode. */
		input_mode?: InputMode;
		children?: Snippet;
	} = $props();

	const encoder = new TextEncoder();

	// per-mode raw state
	let text_input = $state('');
	let hex_input = $state('');
	let base64_input = $state('');
	let file_bytes: Uint8Array | null = $state(null);
	let file_name: string | null = $state(null);
	let file_size: number | null = $state(null);

	let validation_error: string | null = $state(null);
	let dragging = $state(false);

	let file_input_el: HTMLInputElement | undefined = $state();

	// decode base64 to bytes, null on invalid
	const decode_base64 = (s: string): Uint8Array | null => {
		try {
			const binary = atob(s);
			const bytes = new Uint8Array(binary.length);
			for (let i = 0; i < binary.length; i++) {
				bytes[i] = binary.charCodeAt(i);
			}
			return bytes;
		} catch {
			return null;
		}
	};

	// recompute value from active mode
	$effect(() => {
		validation_error = null;
		switch (input_mode) {
			case 'text': {
				value = text_input.length > 0 ? encoder.encode(text_input) : null;
				break;
			}
			case 'file': {
				value = file_bytes;
				break;
			}
			case 'hex': {
				if (hex_input.replace(/\s/g, '').length === 0) {
					value = null;
				} else {
					const decoded = from_hex(hex_input);
					if (decoded === null) {
						validation_error = 'invalid hex';
						value = null;
					} else {
						value = decoded;
					}
				}
				break;
			}
			case 'base64': {
				const trimmed = base64_input.trim();
				if (trimmed.length === 0) {
					value = null;
				} else {
					const decoded = decode_base64(trimmed);
					if (decoded === null) {
						validation_error = 'invalid base64';
						value = null;
					} else {
						value = decoded;
					}
				}
				break;
			}
		}
	});

	const read_file = (file: File): void => {
		file_name = file.name;
		file_size = file.size;
		const reader = new FileReader();
		reader.onload = () => {
			file_bytes = new Uint8Array(reader.result as ArrayBuffer);
		};
		reader.onerror = () => {
			validation_error = 'failed to read file';
			file_bytes = null;
		};
		reader.readAsArrayBuffer(file);
	};

	const ondrop = (e: DragEvent): void => {
		e.preventDefault();
		dragging = false;
		const file = e.dataTransfer?.files[0];
		if (file) read_file(file);
	};

	const ondragover = (e: DragEvent): void => {
		e.preventDefault();
		dragging = true;
	};

	const ondragleave = (): void => {
		dragging = false;
	};

	const onfilechange = (e: Event): void => {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) read_file(file);
	};

	const paste_into = (target: 'text' | 'hex' | 'base64') => {
		return async () => {
			try {
				const text = await navigator.clipboard.readText();
				switch (target) {
					case 'text': {
						text_input = text;
						break;
					}
					case 'hex': {
						hex_input = text;
						break;
					}
					case 'base64': {
						base64_input = text;
						break;
					}
				}
			} catch {
				// clipboard access denied
			}
		};
	};
</script>

<div {...rest} class="data_input box {rest.class ?? ''}">
	<nav class="row gap_xs">
		{#each input_modes as mode (mode)}
			<button
				type="button"
				class={{ selected: input_mode === mode }}
				onclick={() => (input_mode = mode)}
			>
				{mode}
			</button>
		{/each}
	</nav>

	<section class="data_input_area">
		{#if input_mode === 'text'}
			<div class="box">
				<textarea bind:value={text_input} placeholder="enter text..." rows="6" class="width:100%"
				></textarea>
				<div class="row gap_xs">
					<button type="button" class="chip" onclick={paste_into('text')}>paste</button>
				</div>
			</div>
		{:else if input_mode === 'file'}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class={['drop_zone panel shadow_inset_xs p_lg', { dragging }]}
				{ondrop}
				{ondragover}
				{ondragleave}
			>
				{#if file_name}
					<p>
						<strong>{file_name}</strong>
						{#if file_size !== null}
							<span>({format_bytes(file_size)})</span>
						{/if}
					</p>
				{:else}
					<p>drop a file here or</p>
				{/if}
				<button type="button" class="chip" onclick={() => file_input_el?.click()}>
					choose file
				</button>
				<input bind:this={file_input_el} type="file" onchange={onfilechange} hidden />
			</div>
		{:else if input_mode === 'hex'}
			<div class="box">
				<textarea
					bind:value={hex_input}
					placeholder="enter hex (e.g. 48656c6c6f)..."
					rows="6"
					class="width:100%"
					spellcheck="false"></textarea>
				<div class="row gap_xs">
					<button type="button" class="chip" onclick={paste_into('hex')}>paste</button>
				</div>
			</div>
		{:else if input_mode === 'base64'}
			<div class="box">
				<textarea
					bind:value={base64_input}
					placeholder="enter base64 (e.g. SGVsbG8=)..."
					rows="6"
					class="width:100%"
					spellcheck="false"></textarea>
				<div class="row gap_xs">
					<button type="button" class="chip" onclick={paste_into('base64')}>paste</button>
				</div>
			</div>
		{/if}
	</section>

	<div class="row gap_md">
		{#if validation_error}
			<small class="negative_60">{validation_error}</small>
		{/if}
	</div>

	{#if children}{@render children()}{/if}
</div>

<style>
	.data_input_area {
		height: calc(100px + var(--space_lg) + var(--input_height));
	}
	.drop_zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		border: 2px dashed var(--border_color);
		border-radius: var(--border_radius_sm);
		transition: border-color 120ms;
	}
	.drop_zone.dragging {
		border-color: var(--palette_a_50);
	}
</style>
