// export let baseClientOpts = {
//   // dapiAddresses: [
//   //   // IP or url(s) pointing to your server(s)
//   //   'dashmate:3000:3010',
//   //   'dashmate:3100:3110',
//   //   'dashmate:3200:3210',
//   // ],
// }

class InLocalStorage {
  constructor(storage = window.localStorage) {
    this.isConfig = false;
    this.storage = storage
  }

  config() {
    this.isConfig = true;
  }

  setItem(key, item) {
    this.storage.setItem(key, JSON.stringify(item));
    return item;
  }

  getItem(key) {
    return JSON.parse(this.storage.getItem(key));
  }
}

export function genWalletClient(
  mnemonic,
  contractId,
  appName = 'testApp',
  network = 'testnet',
  height = 836699
) {
  let cfg = {
    // ...baseClientOpts,
    wallet: {
      adapter: new InLocalStorage(),
      mnemonic,
      offlineMode: mnemonic === null,
    },
  }

  if (network === 'testnet') {
    cfg = {
      ...cfg,
      network: 'testnet',
      unsafeOptions: {
        skipSynchronizationBeforeHeight: height, // only sync from late-2022
      },
    }
  } else if (network) {
    cfg = {
      ...cfg,
      dapiAddresses: [
        ...(network?.split(',') || [])
      ],
    }
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

  console.log('genWalletClient', { contractId, cfg })

  return cfg
}

export default {
  // baseClientOpts,
  genWalletClient,
}