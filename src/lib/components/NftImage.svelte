<script lang="ts">
	export let url = ''
</script>

{#if url}
	<img src={url} alt="NFT media" class="rounded object-cover w-64 h-64" />
{:else}
	<div class="card w-64 h-64 variant-ringed flex justify-center items-center">
		<span class="material-symbols-outlined">image</span>
	</div>
{/if}
