<script lang="ts">
	import { modalStore, type ModalSettings } from '@skeletonlabs/skeleton'

	import { isOptedIn } from '$lib/stores'
	import NftImage from './NftImage.svelte'

	export let assetID: number
	export let assetName: string
	export let assetURL: string
	export let currentBid: number
	export let buyoutPrice: number
	export let auctionEnd: number
	export let sellerAddress: string
	export let currentBidderAddress: string
	export let sellerPaid: number
	export let nftSent: number

	function handleClick() {
		let d: ModalSettings
		if ($isOptedIn) {
			d = {
				type: 'component',
				component: 'modalBid',
				meta: {
					assetID,
					assetName,
					assetURL,
					currentBid,
					buyoutPrice,
					auctionEnd,
					sellerAddress,
					currentBidderAddress,
					sellerPaid,
					nftSent
				}
			}
		} else {
			d = {
				type: 'component',
				component: 'modalOptIn'
			}
		}
		modalStore.trigger(d)
	}
</script>

<div class="card card-glass-primary m-4">
	<header class="card-header flex justify-center">
		<NftImage url={assetURL} />
	</header>
	<hr class="my-4" />
	<footer class="card-footer flex justify-between items-center">
		<strong
			>{auctionEnd * 1000 <= Date.now()
				? 'Auction Ended'
				: currentBid / 1_000_000 + ' ALGO'}</strong
		>
		<button on:click={handleClick} class="btn variant-filled">{'View'}</button>
	</footer>
</div>
