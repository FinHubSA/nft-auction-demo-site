<script lang="ts">
	import {
		modalStore,
		toastStore,
		type ToastSettings,
		ProgressRadial
	} from '@skeletonlabs/skeleton'

	import { address, isOptedIn, isTransacting, peraWallet } from '$lib/stores'
	import {
		OnApplicationComplete,
		makeApplicationCallTxnFromObject,
		waitForConfirmation
	} from 'algosdk'
	import { algodClient } from '$lib/util/client'
	import { AUCTION_APP_ID } from '$lib/util/sdk'
	import type { SignerTransaction } from '@perawallet/connect/dist/util/model/peraWalletModels'

	export let parent: any

	async function onFormSubmit(): Promise<void> {
		const suggestedParams = await algodClient.getTransactionParams().do()
		const optInTxn = makeApplicationCallTxnFromObject({
			from: $address,
			appIndex: AUCTION_APP_ID,
			suggestedParams: suggestedParams,
			onComplete: OnApplicationComplete.OptInOC
		})

		const txns: SignerTransaction[] = [{ txn: optInTxn, signers: [$address] }]

		try {
			$isTransacting = true
			const signedTxns = await $peraWallet.signTransaction([txns])
			const { txId } = await algodClient.sendRawTransaction(signedTxns).do()
			const result = await waitForConfirmation(algodClient, txId, 5)
			$isTransacting = false
			$isOptedIn = true
			const t: ToastSettings = {
				message: 'Successfully opted in',
				autohide: false
			}
			toastStore.trigger(t)
			modalStore.close()
		} catch (error) {
			$isTransacting = false
			const t: ToastSettings = {
				message: 'An error occurred - please opt in again.',
				background: 'variant-filled-error',
				autohide: false
			}
			toastStore.trigger(t)
		}
	}
	const cBase = 'card p-8 w-modal shadow-xl space-y-4'
</script>

<div class={cBase}>
	<div class="flex flex-col space-y-4 justify-center items-center">
		<h2>Opt In</h2>
		<p>
			You have to opt into the auction smart contract before you can create an auction or bid on
			one.
		</p>
	</div>
	<footer class="modal-footer {parent.regionFooter}">
		<button class="btn {parent.buttonNeutral}" on:click={parent.onClose} disabled={$isTransacting}
			>{parent.buttonTextCancel}</button
		>
		{#if $isTransacting}
			<button class="btn {parent.buttonPositive}" on:click={onFormSubmit} disabled={true}
				><ProgressRadial width="w-4" /></button
			>
		{:else}
			<button class="btn {parent.buttonPositive}" on:click={onFormSubmit}>Opt In</button>
		{/if}
	</footer>
</div>
