<script lang="ts">
	import { onMount } from 'svelte'

	import { address, auctions, isLoadingAuctions, isOptedIn, peraWallet } from '$lib/stores'
	import { popup, type PopupSettings } from '@skeletonlabs/skeleton'
	import { getAuctions, isAccountOptedIn } from '$lib/util/sdk'

	const popupWalletSettings: PopupSettings = {
		event: 'hover',
		target: 'wallet'
	}

	onMount(() => {
		// Reconnect to the session when the component is mounted
		$peraWallet
			.reconnectSession()
			.then(async (accounts) => {
				// Setup the disconnect event listener
				$peraWallet.connector?.on('disconnect', handleDisconnect)
				if ($peraWallet.isConnected && accounts.length) {
					$address = accounts[0]
					$isOptedIn = await isAccountOptedIn(accounts[0])
				}
				peraWallet.set($peraWallet)
			})
			.catch((e) => {
				console.log(e)
			})
	})

	function handleConnect() {
		$peraWallet
			.connect()
			.then(async (accounts) => {
				// Setup the disconnect event listener
				$peraWallet.connector?.on('disconnect', handleDisconnect)
				$address = accounts[0]
				$isOptedIn = await isAccountOptedIn(accounts[0])
				peraWallet.set($peraWallet)
				$isLoadingAuctions = true
				$auctions = await getAuctions()
				$isLoadingAuctions = false
			})
			.catch((error) => {
				if (error?.data?.type !== 'CONNECT_MODAL_CLOSED') {
					console.log(error)
				}
			})
	}

	function handleDisconnect() {
		$peraWallet.disconnect().then(() => {
			peraWallet.set($peraWallet)
			$address = ''
		})
	}
</script>

<button
	class="btn-icon {$peraWallet.isConnected ? 'variant-filled-success' : 'variant-filled'}"
	on:click={!$peraWallet.isConnected ? handleConnect : handleDisconnect}
	use:popup={popupWalletSettings}
>
	<span class="material-symbols-outlined"> account_balance_wallet </span>
</button>

<div class="card variant-filled p-4" data-popup="wallet">
	{$peraWallet.isConnected ? 'Disconnect' : 'Connect'}
	<!-- Append the arrow element -->
	<div class="arrow variant-filled" />
</div>
