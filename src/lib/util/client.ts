import { Algodv2, Indexer } from 'algosdk'

export const algodClient = new Algodv2('', 'https://testnet-api.algonode.cloud', '')
export const indexerClient = new Indexer('', 'https://testnet-idx.algonode.cloud', '')
