import { PeraWalletConnect } from '@perawallet/connect'
import { writable, type Writable } from 'svelte/store'
import type { Auction } from './util/sdk'

export const address = writable('')
export const peraWallet = writable(new PeraWalletConnect())
export const auctions: Writable<Auction[]> = writable([])
export const isLoadingAuctions = writable(false)
export const isOptedIn = writable(false)
export const isTransacting = writable(false)
