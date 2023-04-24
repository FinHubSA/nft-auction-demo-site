import { decodeUint64, encodeAddress } from 'algosdk'
import { algodClient, indexerClient } from './client'

export const AUCTION_APP_ID = 202944926
export const AUCTION_APP_ADDRESS = 'PT6EV2JQ4CZ5YK5ZTUO2A7V3BAIBPU52RARK34YHK7MFLT3MLWTC5LG3OE'
export const ZERO_ADDRESS = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ'
export const AUCTION_MBR_AMOUNT = 147300

export interface Auction {
	assetID: number
	assetName: string
	assetURL: string
	currentBid: number
	buyoutPrice: number
	auctionEnd: number
	sellerAddress: string
	currentBidderAddress: string
	sellerPaid: number
	nftSent: number
}

export interface AuctionStats {
	auctionsCreated: number
	liveAuctions: number
}

export async function getAuctions(): Promise<Auction[]> {
	const auctions: Auction[] = []

	// For demo purposes, always grabs 12 auctions from the indexer
	const { boxes } = await indexerClient.searchForApplicationBoxes(AUCTION_APP_ID).limit(12).do()

	await Promise.all(
		boxes.map(async (box) => {
			const { value } = await indexerClient
				.lookupApplicationBoxByIDandName(AUCTION_APP_ID, box.name)
				.do()

			const decodedKey = Buffer.from(box.name, 'base64')
			const sellerAddress = encodeAddress(decodedKey.slice(0, 32))
			const assetID = decodeUint64(decodedKey.slice(32, 40), 'safe')

			const decodedValue = Buffer.from(value, 'base64')
			const auctionEnd = decodeUint64(decodedValue.slice(0, 8), 'safe')
			const buyoutPrice = decodeUint64(decodedValue.slice(8, 16), 'safe')
			const currentBid = decodeUint64(decodedValue.slice(16, 24), 'safe')
			const currentBidderAddress = encodeAddress(decodedValue.slice(24, 56))
			const sellerPaid = decodeUint64(decodedValue.slice(56, 64), 'safe')
			const nftSent = decodeUint64(decodedValue.slice(64, 72), 'safe')

			const resp = await algodClient.getAssetByID(assetID).do()
			const assetName = resp.params.name
			const assetURL = resp.params.url

			const auction: Auction = {
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

			auctions.push(auction)
		})
	)

	return auctions
}

export async function getAccountAuctionInfo(address: string): Promise<Record<string, any> | null> {
	try {
		const resp = await algodClient.accountApplicationInformation(address, AUCTION_APP_ID).do()
		if (resp['app-local-state']) {
			return resp['app-local-state']
		}
		return null
	} catch (error) {
		return null
	}
}

export async function isAccountOptedIn(address: string): Promise<boolean> {
	const resp = await getAccountAuctionInfo(address)
	if (resp) {
		return true
	}
	return false
}

export async function getAuctionStats(): Promise<AuctionStats> {
	const stats: AuctionStats = {
		auctionsCreated: 0,
		liveAuctions: 0
	}

	try {
		const resp = await algodClient.getApplicationByID(AUCTION_APP_ID).do()
		if (resp.params['global-state']) {
			console.log(resp.params['global-state'])
			resp.params['global-state'].forEach((element) => {
				const key = Buffer.from(element.key, 'base64').toString()
				if (key == 'auctions_created') {
					stats.auctionsCreated = element.value.uint
				} else if (key == 'live_auctions') {
					stats.liveAuctions = element.value.uint
				}
			})
		}
	} catch (error) {
		console.log(error)
	}

	return stats
}
