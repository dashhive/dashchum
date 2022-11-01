export let baseClientOpts = {
  dapiAddresses: [
    // IP or url(s) pointing to your server(s)
    'dashmate:3000:3010',
    'dashmate:3100:3110',
    'dashmate:3200:3210',
  ],
  // seeds: [{
  //   // a url pointing to your server
  //   host: 'dashmate',
  //   httpPort: 3000,
  //   grpcPort: 3010,
  // }],
  // network: 'testnet',
}

export let newWalletClientOpts = {
  ...baseClientOpts,
  wallet: {
    mnemonic: null,
    offlineMode: true,
  },
}

export let alphaMnemonic = localStorage.getItem('mnemonic')
// export let alphaAddress = localStorage.getItem('address')
// export let alphaIdentityId = localStorage.getItem('identity_id')
// export let alphaContractId = localStorage.getItem('contract_id')

export let alphaWalletClientOpts = {
  ...baseClientOpts,
  wallet: {
    mnemonic: alphaMnemonic,
    offlineMode: alphaMnemonic === null,
    // unsafeOptions: {
    //   // skipSynchronizationBeforeHeight: 650000, // only sync from early-2022
    //   skipSynchronizationBeforeHeight: 790, // devnet Oct 26 2022
    // },
  },
}

export function genWalletClient(mnemonic, contractId, appName = 'testApp') {
  let cfg = {
    ...baseClientOpts,
    wallet: {
      mnemonic,
      // unsafeOptions: {
      //   // skipSynchronizationBeforeHeight: 650000, // only sync from early-2022
      //   skipSynchronizationBeforeHeight: 790, // devnet Oct 26 2022
      // },
    },
  }

  if (contractId) {
    cfg = {
      ...cfg,
      apps: {
        [appName]: {
          contractId,
        },
      },
    }
  }

  console.log('genWalletClient contractId', contractId, cfg)

  return cfg
}

export default {
  baseClientOpts,
  newWalletClientOpts,
  alphaWalletClientOpts,
  genWalletClient,
  // alphaIdentityId,
  // alphaContractId,
  // alphaMnemonic,
}