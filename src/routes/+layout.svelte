<script lang="ts">
	// The ordering of these imports is critical to your app working properly
	import '@skeletonlabs/skeleton/themes/theme-skeleton.css'
	// If you have source.organizeImports set to true in VSCode, then it will auto change this ordering
	import '@skeletonlabs/skeleton/styles/all.css'
	// Most of your app wide CSS should be put in this file
	import '../app.postcss'

	import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom'
	import {
		AppShell,
		AppBar,
		Modal,
		type ModalSettings,
		modalStore,
		storePopup,
		type ModalComponent,
		type PopupSettings,
		popup,
		Toast
	} from '@skeletonlabs/skeleton'

	import ModalAuction from '$lib/components/ModalAuction.svelte'
	import ModalBid from '$lib/components/ModalBid.svelte'
	import ModalMint from '$lib/components/ModalMint.svelte'
	import ModalOptIn from '$lib/components/ModalOptIn.svelte'
	import WalletConnect from '$lib/components/WalletConnect.svelte'
	import { address, isOptedIn, peraWallet } from '$lib/stores'
	import { truncateAddress } from '$lib/util/misc'

	let value: number = 0

	storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow })

	const popupCreateAuctionSettings: PopupSettings = {
		event: 'hover',
		target: 'createAuction'
	}

	const popupMintSettings: PopupSettings = {
		event: 'hover',
		target: 'mint'
	}

	const modalComponentRegistry: Record<string, ModalComponent> = {
		modalAuction: {
			ref: ModalAuction
		},
		modalBid: {
			ref: ModalBid
		},
		modalMint: {
			ref: ModalMint
		},
		modalOptIn: {
			ref: ModalOptIn
		}
	}

	function handleCreateAuctionClick() {
		let d: ModalSettings
		if ($isOptedIn) {
			d = {
				type: 'component',
				component: 'modalAuction'
			}
		} else {
			d = {
				type: 'component',
				component: 'modalOptIn'
			}
		}
		modalStore.trigger(d)
	}

	function handleMintClick() {
		const d: ModalSettings = {
			type: 'component',
			component: 'modalMint'
		}
		modalStore.trigger(d)
	}
</script>

<Modal components={modalComponentRegistry} />
<Toast />
<AppShell>
	<svelte:fragment slot="header">
		<AppBar>
			<svelte:fragment slot="lead">
				<h1 class="text-xl uppercase text-center">Auction House</h1>
			</svelte:fragment>
			<svelte:fragment slot="trail">
				<div class="flex items-center space-x-4 {!$peraWallet.isConnected ? 'hidden' : ''}">
					<button
						class="btn-icon variant-ringed"
						use:popup={popupCreateAuctionSettings}
						on:click={handleCreateAuctionClick}
					>
						<span class="material-symbols-outlined">sell</span>
					</button>
					<button
						class="btn-icon variant-ringed"
						use:popup={popupMintSettings}
						on:click={handleMintClick}
					>
						<span class="material-symbols-outlined">toll</span>
					</button>
				</div>
				<WalletConnect />
			</svelte:fragment>
			<div class="card variant-filled p-4" data-popup="createAuction">
				Create Auction
				<div class="arrow variant-filled" />
			</div>

			<div class="card variant-filled p-4" data-popup="mint">
				Mint NFT
				<div class="arrow variant-filled" />
			</div>

			<div class="card variant-filled p-4" data-popup="wallet">
				{$peraWallet.isConnected ? 'Disconnect ' + truncateAddress($address) : 'Connect'}
				<div class="arrow variant-filled" />
			</div>
		</AppBar>
	</svelte:fragment>
	<slot />
</AppShell>
