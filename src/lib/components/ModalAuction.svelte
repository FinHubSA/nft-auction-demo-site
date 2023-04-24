<script lang="ts">
	import {
		modalStore,
		toastStore,
		type ToastSettings,
		ProgressRadial
	} from '@skeletonlabs/skeleton'

	import { auctions, address, isLoadingAuctions, peraWallet, isTransacting } from '$lib/stores'
	import NftImage from './NftImage.svelte'
	import { onMount } from 'svelte'
	import {
		OnApplicationComplete,
		assignGroupID,
		decodeAddress,
		encodeUint64,
		makeApplicationCallTxnFromObject,
		makeAssetTransferTxnWithSuggestedParamsFromObject,
		makePaymentTxnWithSuggestedParamsFromObject,
		waitForConfirmation
	} from 'algosdk'
	import { algodClient, indexerClient } from '$lib/util/client'
	import {
		AUCTION_APP_ADDRESS,
		AUCTION_APP_ID,
		AUCTION_MBR_AMOUNT,
		getAuctions
	} from '$lib/util/sdk'
	import type { SignerTransaction } from '@perawallet/connect/dist/util/model/peraWalletModels'

	export let parent: any

	const formData = {
		index: 0,
		startingPrice: '',
		buyoutPrice: '',
		auctionEnd: ''
	}

	type NFT = {
		assetID: number
		url: string
	}

	let nfts: NFT[] = []

	let url = ''

	$: {
		if (nfts.length > 0) {
			url = nfts[formData.index].url
		}
	}

	onMount(async () => {
		const { assets } = await indexerClient.lookupAccountAssets($address).do()
		assets.forEach(async (asa: any) => {
			if (asa.deleted) {
				return
			}

			const { asset } = await indexerClient.lookupAssetByID(asa['asset-id']).do()
			if (asset.params.total == 1 && asset.params.decimals == 0 && asa.amount > 0) {
				nfts = [...nfts, { assetID: asa['asset-id'], url: asset.params.url }]
			}
		})
	})

	async function onFormSubmit(): Promise<void> {
		const suggestedParams = await algodClient.getTransactionParams().do()
		const payTxn = makePaymentTxnWithSuggestedParamsFromObject({
			from: $address,
			to: AUCTION_APP_ADDRESS,
			suggestedParams,
			amount: AUCTION_MBR_AMOUNT
		})
		const suggestedParams2 = { ...suggestedParams }
		suggestedParams2.flatFee = true
		suggestedParams2.fee = 2000
		const appTxn = makeApplicationCallTxnFromObject({
			from: $address,
			appIndex: AUCTION_APP_ID,
			suggestedParams: suggestedParams2,
			onComplete: OnApplicationComplete.NoOpOC,
			appArgs: [
				Uint8Array.from(Buffer.from('create_auction')),
				encodeUint64(parseInt(formData.auctionEnd) * 60 + Math.floor(Date.now() / 1000)),
				encodeUint64(Math.floor(parseFloat(formData.startingPrice) * 1_000_000)),
				encodeUint64(Math.floor(parseFloat(formData.buyoutPrice) * 1_000_000))
			],
			boxes: [
				{
					appIndex: AUCTION_APP_ID,
					name: new Uint8Array([
						...decodeAddress($address).publicKey,
						...encodeUint64(nfts[formData.index].assetID)
					])
				}
			],
			foreignAssets: [nfts[formData.index].assetID]
		})
		const axferTxn = makeAssetTransferTxnWithSuggestedParamsFromObject({
			from: $address,
			to: AUCTION_APP_ADDRESS,
			suggestedParams: suggestedParams,
			amount: 1,
			assetIndex: nfts[formData.index].assetID
		})

		const txnsWithGroupIDs = assignGroupID([payTxn, appTxn, axferTxn])

		const txns: SignerTransaction[] = [
			{ txn: txnsWithGroupIDs[0], signers: [$address] },
			{ txn: txnsWithGroupIDs[1], signers: [$address] },
			{ txn: txnsWithGroupIDs[2], signers: [$address] }
		]

		try {
			$isTransacting = true
			const signedTxns = await $peraWallet.signTransaction([txns])
			const { txId } = await algodClient.sendRawTransaction(signedTxns).do()
			await waitForConfirmation(algodClient, txId, 5)
			$isTransacting = false

			$isLoadingAuctions = true
			$auctions = await getAuctions()
			$isLoadingAuctions = false
			const t: ToastSettings = {
				message: 'Auction successfully created',
				autohide: false
			}
			toastStore.trigger(t)
			modalStore.close()
		} catch (error) {
			$isTransacting = false
			const t: ToastSettings = {
				message: 'An error occurred while creating the auction - pelase try again',
				background: 'variant-filled-error',
				autohide: false
			}
			toastStore.trigger(t)
			console.log(error)
		}
	}
	const cBase = 'card p-8 w-modal shadow-xl space-y-4'
	const cForm = 'border border-surface-500 p-4 space-y-4 rounded-container-token'
</script>

<div class={cBase}>
	<div class="flex space-x-4 justify-center items-center">
		<div>
			<form class={cForm}>
				<label class="label">
					<span>Asset ID</span>
					<select class="input" bind:value={formData.index}>
						{#each nfts as nft, i (nft.assetID)}
							<option value={i}>{nft.assetID}</option>
						{/each}
					</select>
				</label>
				<label class="label">
					<span>Starting Price (ALGO)</span>
					<input
						class="input"
						type="text"
						bind:value={formData.startingPrice}
						placeholder="Base price of your auction"
					/>
				</label>
				<label class="label">
					<span>Buyout Price (ALGO)</span>
					<input
						class="input"
						type="text"
						bind:value={formData.buyoutPrice}
						placeholder="The price someone can bid at to immediately win auction"
					/>
				</label>
				<label class="label">
					<span>Auction End</span>
					<input
						class="input"
						type="text"
						bind:value={formData.auctionEnd}
						placeholder="Number of minutes from now"
					/>
				</label>
			</form>
		</div>
		<span class="divider-vertical h-72" />
		<NftImage {url} />
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
			<button class="btn {parent.buttonPositive}" on:click={onFormSubmit}>Create Auction</button>
		{/if}
	</footer>
</div>
