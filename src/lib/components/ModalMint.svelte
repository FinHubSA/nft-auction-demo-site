<script lang="ts">
	import { modalStore, type ToastSettings, toastStore } from '@skeletonlabs/skeleton'
	import { makeAssetCreateTxnWithSuggestedParamsFromObject, waitForConfirmation } from 'algosdk'

	import { address, isTransacting, peraWallet } from '$lib/stores'
	import NftImage from './NftImage.svelte'
	import { algodClient } from '$lib/util/client'
	import type { SignerTransaction } from '@perawallet/connect/dist/util/model/peraWalletModels'

	export let parent: any

	const formData = {
		assetName: '',
		url: ''
	}

	let url = ''

	async function onFormSubmit(): Promise<void> {
		const suggestedParams = await algodClient.getTransactionParams().do()
		const txn = makeAssetCreateTxnWithSuggestedParamsFromObject({
			from: $address,
			assetName: formData.assetName,
			assetURL: formData.url,
			total: 1,
			decimals: 0,
			suggestedParams,
			defaultFrozen: false
		})
		const txns: SignerTransaction[] = [
			{
				txn,
				signers: [$address]
			}
		]

		try {
			$isTransacting = true
			const signedTxn = await $peraWallet.signTransaction([txns])
			const { txId } = await algodClient.sendRawTransaction(signedTxn).do()
			const result = await waitForConfirmation(algodClient, txId, 10)
			$isTransacting = false

			const t: ToastSettings = {
				message: `NFT created with ID: ${result['asset-index']}`,
				autohide: false
			}
			toastStore.trigger(t)
			modalStore.close()
		} catch (error) {
			$isTransacting = false
			const t: ToastSettings = {
				message: `An error occurred. Please try again if you did not receive your NFT.`,
				background: 'variant-filled-error',
				autohide: false
			}
			toastStore.trigger(t)
		}
	}
	const cBase = 'card p-8 w-modal shadow-xl space-y-4'
	const cForm = 'border border-surface-500 p-4 space-y-4 rounded-container-token h-64'

	$: {
		fetch(formData.url).then((response) => {
			if (response.status == 200) {
				url = formData.url
			} else {
				url = ''
			}
		})
	}
</script>

<div class={cBase}>
	<div class="flex space-x-4 justify-center items-center">
		<form class={cForm}>
			<label class="label">
				<span>NFT Name</span>
				<input
					class="input"
					type="text"
					bind:value={formData.assetName}
					placeholder="The name for this NFT"
				/>
			</label>
			<label class="label">
				<span>Media URL</span>
				<input
					class="input"
					type="text"
					bind:value={formData.url}
					placeholder="A public link to the media that will represent this NFT"
				/>
			</label>
		</form>
		<span class="divider-vertical h-64" />
		<NftImage {url} />
	</div>
	<footer class="modal-footer {parent.regionFooter}">
		<button class="btn {parent.buttonNeutral}" on:click={parent.onClose} disabled={$isTransacting}
			>{parent.buttonTextCancel}</button
		>
		{#if $isTransacting}
			<button class="btn {parent.buttonPositive}" on:click={onFormSubmit} disabled={true}
				>Mint NFT</button
			>
		{:else}
			<button class="btn {parent.buttonPositive}" on:click={onFormSubmit}>Mint NFT</button>
		{/if}
	</footer>
</div>
