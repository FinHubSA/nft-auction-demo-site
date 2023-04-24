<script lang="ts">
	import {
		modalStore,
		toastStore,
		type ToastSettings,
		ProgressRadial
	} from '@skeletonlabs/skeleton'
	import { format } from 'date-fns'

	import { address, auctions, isLoadingAuctions, isTransacting, peraWallet } from '$lib/stores'
	import { truncateAddress } from '$lib/util/misc'
	import { algodClient } from '$lib/util/client'
	import { AUCTION_APP_ADDRESS, AUCTION_APP_ID, ZERO_ADDRESS, getAuctions } from '$lib/util/sdk'
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
	import type { SignerTransaction } from '@perawallet/connect/dist/util/model/peraWalletModels'

	export let parent: any

	const formData = {
		bid: ''
	}

	const userIsSeller = $modalStore[0]?.meta.sellerAddress == $address
	const userIsBidder = $modalStore[0]?.meta.currentBidderAddress == $address
	const auctionEnd = $modalStore[0]?.meta.auctionEnd * 1000
	const auctionHasEnded = auctionEnd <= Date.now()
	let actionButtionText = ''

	if (userIsSeller) {
		if ($modalStore[0]?.meta.currentBidderAddress == ZERO_ADDRESS) {
			actionButtionText = 'Claim NFT'
		} else if ($modalStore[0]?.meta.sellerPaid == 1) {
			actionButtionText = 'Already Paid'
		} else {
			actionButtionText = 'Get Paid'
		}
	} else if (userIsBidder) {
		if ($modalStore[0]?.meta.nftSent == 1) {
			actionButtionText = 'NFT Claimed'
		} else {
			actionButtionText = 'Claim NFT'
		}
	} else {
		actionButtionText = 'Bid'
	}

	// We've created a custom submit function to pass the response and close the modal.
	async function onFormSubmit(): Promise<void> {
		const boxKey = new Uint8Array([
			...decodeAddress($modalStore[0]?.meta.sellerAddress).publicKey,
			...encodeUint64($modalStore[0]?.meta.assetID)
		])
		if (auctionHasEnded) {
			const suggestedParams = await algodClient.getTransactionParams().do()
			const suggestedParams2 = { ...suggestedParams }
			suggestedParams.flatFee = true
			suggestedParams.fee = 3000
			const accounts = []
			const optInTxn = makeAssetTransferTxnWithSuggestedParamsFromObject({
				from: $address,
				to: $address,
				assetIndex: $modalStore[0]?.meta.assetID,
				amount: 0,
				suggestedParams: suggestedParams2
			})
			if (userIsBidder) {
				accounts.push($modalStore[0]?.meta.sellerAddress)
			}
			const appTxn = makeApplicationCallTxnFromObject({
				from: $address,
				appIndex: AUCTION_APP_ID,
				suggestedParams: suggestedParams,
				onComplete: OnApplicationComplete.NoOpOC,
				appArgs: [Uint8Array.from(Buffer.from('settle')), boxKey],
				foreignAssets: [$modalStore[0]?.meta.assetID],
				accounts,
				boxes: [
					{
						appIndex: AUCTION_APP_ID,
						name: boxKey
					}
				]
			})
			let txns: SignerTransaction[] = []

			if (userIsBidder) {
				const txnsWithGroupIDs = assignGroupID([optInTxn, appTxn])
				txns = [
					{ txn: txnsWithGroupIDs[0], signers: [$address] },
					{ txn: txnsWithGroupIDs[1], signers: [$address] }
				]
			} else {
				txns = [{ txn: appTxn, signers: [$address] }]
			}

			try {
				$isTransacting = true
				const signedTxns = await $peraWallet.signTransaction([txns])
				const { txId } = await algodClient.sendRawTransaction(signedTxns).do()
				const result = await waitForConfirmation(algodClient, txId, 5)
				$isTransacting = false

				const t: ToastSettings = {
					message: `Successfully ${
						userIsSeller
							? $modalStore[0]?.meta.currentBidderAddress == ZERO_ADDRESS
								? 'claimed NFT'
								: 'got paid!'
							: 'claimed NFT'
					}`,
					autohide: false
				}
				toastStore.trigger(t)

				$isLoadingAuctions = true
				$auctions = await getAuctions()
				$isLoadingAuctions = false
				modalStore.close()
			} catch (error) {
				$isTransacting = false
				const t: ToastSettings = {
					message: `An error occurred. Please try again.`,
					background: 'variant-filled-error',
					autohide: false
				}
				toastStore.trigger(t)
			}
		} else {
			const bid = Math.floor(parseFloat(formData.bid) * 1_000_000)
			const suggestedParams = await algodClient.getTransactionParams().do()
			const payTxn = makePaymentTxnWithSuggestedParamsFromObject({
				from: $address,
				to: AUCTION_APP_ADDRESS,
				suggestedParams,
				amount: bid
			})
			const suggestedParams2 = { ...suggestedParams }
			suggestedParams2.flatFee = true
			suggestedParams2.fee = 1000
			const accounts = [$modalStore[0]?.meta.sellerAddress]
			if ($modalStore[0]?.meta.currentBidderAddress != ZERO_ADDRESS) {
				accounts.push($modalStore[0]?.meta.currentBidderAddress)
				suggestedParams2.fee += 1000
			}
			if (bid >= $modalStore[0]?.meta.buyoutPrice) {
				suggestedParams2.fee += 3000
			}
			const appTxn = makeApplicationCallTxnFromObject({
				from: $address,
				appIndex: AUCTION_APP_ID,
				suggestedParams: suggestedParams2,
				onComplete: OnApplicationComplete.NoOpOC,
				appArgs: [Uint8Array.from(Buffer.from('place_bid')), boxKey],
				foreignAssets: [$modalStore[0]?.meta.assetID],
				accounts,
				boxes: [
					{
						appIndex: AUCTION_APP_ID,
						name: boxKey
					}
				]
			})

			const txnsWithGroupIDs = assignGroupID([payTxn, appTxn])

			const txns: SignerTransaction[] = [
				{ txn: txnsWithGroupIDs[0], signers: [$address] },
				{ txn: txnsWithGroupIDs[1], signers: [$address] }
			]

			try {
				$isTransacting = true
				const signedTxns = await $peraWallet.signTransaction([txns])
				const { txId } = await algodClient.sendRawTransaction(signedTxns).do()
				const result = await waitForConfirmation(algodClient, txId, 5)
				$isTransacting = false

				$isLoadingAuctions = true
				$auctions = await getAuctions()
				$isLoadingAuctions = false
				const t: ToastSettings = {
					message: `Bid successfully placed`,
					autohide: false
				}
				toastStore.trigger(t)
				modalStore.close()
			} catch (error) {
				$isTransacting = false
				const t: ToastSettings = {
					message: `An error occurred. Please place your bid again.`,
					background: 'variant-filled-error',
					autohide: false
				}
				toastStore.trigger(t)
			}
		}
	}
	const cBase = 'card p-8 w-modal shadow-xl space-y-4'
	const cHeader = 'text-2xl font-bold'
	const cForm = 'border border-surface-500 p-4 space-y-4 rounded-container-token'
</script>

<div class={cBase}>
	<div class="flex space-x-4 justify-center items-center">
		<div>
			<header class={cHeader}>{$modalStore[0]?.meta.assetName ?? ''}</header>
			<div class="my-2">
				<article>Asset ID: {$modalStore[0]?.meta.assetID ?? ''}</article>
				<article>Current bid: {$modalStore[0]?.meta.currentBid / 1_000_000 ?? ''} ALGO</article>
				<article>Buyout price: {$modalStore[0]?.meta.buyoutPrice / 1_000_000 ?? ''} ALGO</article>
				<article>
					Auction ends: {$modalStore[0]?.meta.auctionEnd
						? format(auctionEnd, 'dd/MM/yyyy HH:mm:ss')
						: ''}
				</article>
				<article>
					Seller address: {$modalStore[0]?.meta.sellerAddress
						? truncateAddress($modalStore[0]?.meta.sellerAddress)
						: ''}
				</article>
				<article>
					Bidder address: {$modalStore[0]?.meta.currentBidderAddress
						? truncateAddress($modalStore[0]?.meta.currentBidderAddress)
						: ''}
				</article>
			</div>
			
			<form class={cForm}>
				<label class="label">
					<input
						class="input"
						type="text"
						bind:value={formData.bid}
						placeholder="Bid (minimum 0.01 ALGO)"
						disabled={!$peraWallet.isConnected || auctionHasEnded || userIsSeller || userIsBidder}
					/>
				</label>
			</form>
		</div>
		<span class="divider-vertical h-64" />
		<img
			src={$modalStore[0]?.meta.assetURL}
			alt="NFT media"
			class="rounded object-cover w-64 h-64"
		/>
	</div>
	<footer class="modal-footer {parent.regionFooter}">
		<button class="btn {parent.buttonNeutral}" on:click={parent.onClose} disabled={$isTransacting}>
			{!$peraWallet.isConnected ? 'Exit' : parent.buttonTextCancel}
		</button>
		{#if $isTransacting}
			<button
				class="btn {parent.buttonPositive} {!$peraWallet.isConnected ? 'hidden' : ''}"
				on:click={onFormSubmit}
				disabled={true}
			>
				<ProgressRadial width="w-4" />
			</button>
		{:else}
			<button
				class="btn {parent.buttonPositive} {!$peraWallet.isConnected ? 'hidden' : ''}"
				on:click={onFormSubmit}
				disabled={(!auctionHasEnded && (userIsSeller || userIsBidder)) ||
					(auctionHasEnded && !(userIsSeller || userIsBidder)) ||
					(auctionHasEnded && userIsSeller && $modalStore[0]?.meta.sellerPaid == 1) ||
					(auctionHasEnded && userIsBidder && $modalStore[0]?.meta.nftSent == 1)}
			>
				{actionButtionText}
			</button>
		{/if}
	</footer>
</div>
