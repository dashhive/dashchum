export let baseClientOpts = {
  dapiAddresses: [
    // IP or url(s) pointing to your server(s)
    'dashmate:3000:3010',
    'dashmate:3100:3110',
    'dashmate:3200:3210',
  ],
}

export function genWalletClient(mnemonic, contractId, appName = 'testApp') {
  let cfg = {
    ...baseClientOpts,
    wallet: {
      mnemonic,
      offlineMode: mnemonic === null,
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
  genWalletClient,
}