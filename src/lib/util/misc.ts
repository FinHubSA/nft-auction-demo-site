import { ZERO_ADDRESS } from './sdk'

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const truncateAddress = (address: string) => {
	if (address.length == 58) {
		if (address == ZERO_ADDRESS) {
			return 'None'
		}
		return address.substring(0, 4) + '...' + address.substring(54, 58)
	}

	return ''
}
