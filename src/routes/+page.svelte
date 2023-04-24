<script lang="ts">
	import { ProgressRadial } from '@skeletonlabs/skeleton'

	import Auction from '$lib/components/Auction.svelte'
	import { auctions, isLoadingAuctions } from '$lib/stores'
	import { onMount } from 'svelte'
	import { getAuctions } from '$lib/util/sdk'

	onMount(async () => {
		$isLoadingAuctions = true
		$auctions = await getAuctions()
		$isLoadingAuctions = false
	})
</script>

<div class="flex w-full h-full">
	<div class="container h-full mx-auto flex flex-wrap justify-center items-center">
		{#if $isLoadingAuctions}
			<ProgressRadial width="w-16" />
		{:else}
			{#each $auctions as auction (auction.assetID + auction.sellerAddress)}
				<Auction
					assetID={auction.assetID}
					assetName={auction.assetName}
					assetURL={auction.assetURL}
					currentBid={auction.currentBid}
					buyoutPrice={auction.buyoutPrice}
					auctionEnd={auction.auctionEnd}
					sellerAddress={auction.sellerAddress}
					currentBidderAddress={auction.currentBidderAddress}
					sellerPaid={auction.sellerPaid}
					nftSent={auction.nftSent}
				/>
			{:else}
				<p>No active auctions... Maybe create one? 👉👈</p>
			{/each}
		{/if}
	</div>
</div>
