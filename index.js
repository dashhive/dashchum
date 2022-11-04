// import Dash from 'dash'

import {
  // baseClientOpts,
  genWalletClient,
} from './config.js'

const CONTRACT_APP_NAME = 'dashchumApp'

let alphaMnemonic = localStorage.getItem('mnemonic')
let alphaAddress = localStorage.getItem('address')
let alphaIdentityId = localStorage.getItem('identity_id')
let alphaContractId = localStorage.getItem('contract_id')

window.alphaWalletClientOpts = genWalletClient(
  alphaMnemonic,
  alphaContractId,
  CONTRACT_APP_NAME
)

console.log('window.alphaWalletClientOpts', window.alphaWalletClientOpts)

// const baseClient = new Dash.Client(baseClientOpts)
let client = new Dash.Client(alphaWalletClientOpts)

window.dashClient = client

const SAT = 100000000

let table = document.querySelector('table')
let tbody = table.querySelector('table > tbody')
let POLL_INTERVAL

async function getBestBlock () {
  async function connect() {
    return await client.getDAPIClient().core.getBestBlockHash()
  }

  connect()
    .then((d) => console.log('Connected. Best block hash:\n', d))
    .catch((e) => console.error('Something went wrong:\n', e))
}

async function getChainStatus() {
  async function connect() {
    return await client.getDAPIClient().core.getStatus()
  }

  connect()
    .then((d) => {
      console.log('Connected. Current Block Height:\n', d.chain.blocksCount)
      console.log('Connected. Chain Status:\n', d)
    })
    .catch((e) => console.error('Something went wrong:\n', e))
}

function toggleForm(name, show) {
  const frm = document.querySelector(`form[name="${name}"]`)

  console.log('toggleForm', { name, show, frm, })

  if (typeof show === 'undefined') {
    frm?.classList.toggle('hide')
  } else {
    if (show) {
      frm?.classList.remove('hide')
    } else {
      frm?.classList.add('hide')
    }
  }
}

function setMessage(msg) {
  document.querySelector(`.msg`)
    .innerHTML = msg
}

async function updateUI({ mnemonic, address, acctBalance, prettyBalance, idents, }) {
  if (table?.classList.contains('hide')) {
    table.classList.remove('hide')
  }

  if (mnemonic && address && prettyBalance) {
    tbody.innerHTML = `<tr>
      <td>${prettyBalance}</td>
      <td>${mnemonic}</td>
      <td>${address}</td>
    </tr>`
  }

  if (idents?.length === 0) {
    if (acctBalance > 0) {
      toggleForm('genident', true)
    } else {
      toggleForm('genident', false)
      setMessage(`
        <p>You must fund your wallet before proceeding, see <a href="https://github.com/dashhive/dashchum#funding-your-wallet">Dash Chum docs</a> for instructions or copy & paste the command below in your terminal.</p>

        <pre><code><span class="dem">docker exec -it dash_masternode_local_seed-core-1</span> dash-cli <em>sendtoaddress</em> <address>"${address}"</address> <output>100</output></code></pre>
      `)
    }
  }

  if (!alphaIdentityId && idents?.[0]) {
    localStorage.setItem('identity_id', idents[0])
    alphaIdentityId = idents[0]
    // toggleForm('genident', false)
  }

  console.log('updateUI', { idents, alphaContractId })

  if (idents?.length > 0) {
    toggleForm('genident', false)

    // toggleForm('topup')

    if (!alphaContractId) {
      toggleForm('subdoc', false)
      toggleForm('gencon', true)
    } else {
      toggleForm('gencon', false)
      toggleForm('subdoc', true)

      retrieveContract()
        .then(async (d) => {
          console.log('retrieve data contract', d)
          // console.dir(d?.toJSON(), { depth: 5 })

          let docList = document.createElement('table')

          docList.classList.add('docs')

          function docTable(rows) {
            return `
              <thead align="center">
                <tr><td colspan="3">Documents</td></tr>
                <tr><td width="15%">type</td><td width="15%">revision</td><td>value</td></tr>
              </thead>
              <tbody>${rows}</tbody>
            `
          }

          docList.innerHTML = docTable('')

          document.querySelector('form[name="subdoc"]')
            .insertAdjacentElement('beforeend', docList)

          if (d?.id) {
            await client.getApps().set(CONTRACT_APP_NAME, {
              contractId: Dash.PlatformProtocol.Identifier.from(d.id), // d?.id || d?.dataContract?.id
              contract: d,
            })

            getDocuments()
              .then((d) => {
                console.log('Get Documents:\n', d);

                let docs = d.map(n => {
                  return `<tr>
                    <td>${n.type}</td>
                    <td>${n.revision}</td>
                    <td>${n.data.message}</td>
                  </tr>`
                })

                document.querySelector('form[name="subdoc"] > table > tbody')
                  .innerHTML = docs.join('\n')
              })
              .catch((e) => console.error('Something went wrong:\n', e))
          }
        })
        .catch((e) => console.error('Something went wrong:\n', e))
    }

    for(let iid of idents) {
      let ident = await client.platform.identities.get(iid)
      console.log('Identity', iid, ident)

      if (!document.getElementById(`rid-${iid}`)) {
        tbody.insertAdjacentHTML(
          'beforeend',
          `<tr id="rid-${iid}">
            <td>${new Intl.NumberFormat().format(ident.balance)}</td>
            <td>identity</td>
            <td>${iid}</td>
          </tr>`
        )
      }
    }
  }
}

async function pollWalletStatus() {
  POLL_INTERVAL = setInterval(() => {
    getWalletBalance()
  }, 5000)
}

async function getWalletBalance() {
  setMessage('')

  const account = await client.getWalletAccount()

  const idents = await account.identities.getIdentityIds()

  const mnemonic = client.wallet.exportWallet()
  const { address } = account.getUnusedAddress()

  const totalBalance = await account.getTotalBalance()
  const unBalanced = await account.getUnconfirmedBalance()
  const acctBalance = (await account.getConfirmedBalance()) / SAT
  const prettyBalance = new Intl
    .NumberFormat('en-US', { maximumSignificantDigits: 15 })
    .format(acctBalance)

  console.log('Mnemonic:', mnemonic)
  console.log('Unused address:', address)
  console.log('Balance:', totalBalance, unBalanced, acctBalance, prettyBalance)
  console.log('Identities:', idents)

  account.on(
    Dash.WalletLib.EVENTS.GENERATED_ADDRESS,
    (info) => console.info('GENERATED_ADDRESS', info)
  );
  account.on(
    Dash.WalletLib.EVENTS.CONFIRMED_BALANCE_CHANGED,
    (info) => console.info('CONFIRMED_BALANCE_CHANGED', info)
  );
  account.on(
    Dash.WalletLib.EVENTS.UNCONFIRMED_BALANCE_CHANGED,
    (info) => console.info('UNCONFIRMED_BALANCE_CHANGED', info)
  );
  account.on(
    Dash.WalletLib.EVENTS.PREFETCHED,
    (info) => console.info('PRE_FETCHED', info)
  );
  account.on(
    Dash.WalletLib.EVENTS.DISCOVERY_STARTED,
    (info) => console.info('DISCOVERY_STARTED', info)
  );
  account.on(
    Dash.WalletLib.EVENTS.CONFIGURED,
    (info) => console.info('CONFIGURED_', info)
  );
  account.on(
    Dash.WalletLib.EVENTS.REHYDRATE_STATE_FAILED,
    (info) => console.info('REHYDRATE_STATE_FAILED', info)
  );
  account.on(
    Dash.WalletLib.EVENTS.REHYDRATE_STATE_SUCCESS,
    (info) => console.info('REHYDRATE_STATE_SUCCESS', info)
  );
  account.on(
    Dash.WalletLib.EVENTS.FETCHED_CONFIRMED_TRANSACTION,
    (info) => console.info('FETCHED_CONFIRMED_TRANSACTION', info)
  );
  account.on(
    Dash.WalletLib.EVENTS.TX_METADATA,
    (info) => console.info('TX_METADATA', info)
  );
  account.on(
    Dash.WalletLib.EVENTS.BLOCKHEIGHT_CHANGED,
    (info) => console.info('BLOCKHEIGHT_CHANGED', info)
  );
  account.on(
    Dash.WalletLib.EVENTS.BLOCKHEADER,
    (info) => console.info('BLOCKHEADER_', info)
  );
  account.on(
    Dash.WalletLib.EVENTS.BLOCK,
    (info) => console.info('BLOCK_', info)
  );

  if (!alphaMnemonic) {
    localStorage.setItem('mnemonic', mnemonic)
    alphaMnemonic = mnemonic
  }

  if (address !== alphaAddress) {
    localStorage.setItem('address', address)
    alphaAddress = address
  }

  await updateUI({ mnemonic, address, acctBalance, prettyBalance, idents, })

  // Handle wallet async errors
  client.on('error', (error, context) => {
    console.error(`Client error: ${error.name}`)
    console.error(context)
  })

  return await client
}

async function createIdentity() {
  setMessage('')

  console.log('client.platform.identities', await (await client.getWalletAccount()).identities.getIdentityIds())

  const newIdentity = await client.platform.identities.register()
  const jsonIdent = newIdentity.toJSON()

  console.log('Identity:', newIdentity, jsonIdent)
  localStorage.setItem('identity_id', jsonIdent.id)
  alphaIdentityId = jsonIdent.id

  // if (newIdentity) {
  //   toggleForm('genident')
  // }

  // tbody.insertAdjacentHTML(
  //   'beforeend',
  //   `<tr>
  //     <td>${new Intl.NumberFormat().format(newIdentity.balance)}</td>
  //     <td>identity</td>
  //     <td>${jsonIdent.id}</td>
  //   </tr>`
  // )

  await updateUI({ idents: [jsonIdent.id], })

  return client
}

async function topupIdentity() {
  const topUpAmount = 1500;

  await client.platform.identities.topUp(alphaIdentityId, topUpAmount);
  return client.platform.identities.get(alphaIdentityId);
}


async function registerContract() {
  setMessage('')
  console.log('reg contract for id', alphaIdentityId)
  const identity = await client.platform.identities.get(alphaIdentityId)

  const contractDocuments = {
    note: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  }
  console.log('reg contract', identity, contractDocuments)

  const contract = await client.platform.contracts.create(contractDocuments, identity)

  console.dir({ contract })

  // Make sure contract passes validation checks
  await client.platform.dpp.initialize()
  const validationResult = await client.platform.dpp.dataContract.validate(contract)

  if (validationResult.isValid()) {
    localStorage.setItem('contract_id', contract.id)
    alphaContractId = contract.id
    console.log('Validation passed, broadcasting contract..')
    // Sign and submit the data contract
    return await client.platform.contracts.publish(contract, identity)
  }

  console.error(validationResult) // An array of detailed validation errors
  throw validationResult.errors[0]
}

async function retrieveContract() {
  if (!alphaIdentityId || !alphaContractId) {
    throw { alphaIdentityId, alphaContractId }
  }
  return await client.platform.contracts.get(alphaContractId)
}

async function submitDoc() {
  setMessage('')

  const identity = await client.platform.identities.get(alphaIdentityId);

  // retrieveContract()
  //   .then(async (d) => {
  //     console.log('retrieve data contract', d)

  //     if (d?.id) {
  //       await client.getApps().set(CONTRACT_APP_NAME, {
  //         contractId: Dash.PlatformProtocol.Identifier.from(d.id), // d?.id || d?.dataContract?.id
  //         contract: d,
  //       })
  //     }
  //   })

  // console.log('submitDoc', { event })

  const docProperties = {
    message: `${
      document.subdoc?.elements?.msg?.value || 'empty msg'
    } @ ${
      new Date().toUTCString()
    }`,
  };

  // Create the note document
  const noteDocument = await client.platform.documents.create(
    `${CONTRACT_APP_NAME}.note`,
    identity,
    docProperties,
  );

  const documentBatch = {
    create: [noteDocument], // Document(s) to create
    replace: [], // Document(s) to update
    delete: [], // Document(s) to delete
  };

  console.log(
    'submit doc',
    identity,
    docProperties,
    noteDocument,
    documentBatch,
  )

  // Sign and submit the document(s)
  return await client.platform.documents.broadcast(documentBatch, identity);
}

async function getDocuments() {
  return client.platform.documents.get(`${CONTRACT_APP_NAME}.note`, {
    limit: 20,
  })
}

async function getApps() {
  return await client.getApps()
}

function generateButton(name, callback = () => {}) {
  let generatedButton = document.querySelector(`form[name="${name}"]`)

  generatedButton?.addEventListener('submit', event => {
    event.preventDefault()
    console.log(`form generate ${name} submit`, event)

    callback(event)
      .catch((e) => console.error('Something went wrong:\n', e))
  })

  return generatedButton
}

getBestBlock()

getChainStatus()

getWalletBalance()

getApps()
  .then((d) => {
    console.log('get apps', d)
  })
  .catch((e) => console.error('Something went wrong:\n', e))


// pollWalletStatus()

generateButton(
  'genident',
  () => createIdentity()
)

generateButton(
  'topup',
  () => topupIdentity()
)

generateButton(
  'gencon',
  () => registerContract()
    .then(async d => {
      let dj = d?.toJSON()

      console.log('Contract registered:', d, dj)
      localStorage.setItem('contract_id', d?.id || dj?.dataContract?.$id)
      alphaContractId = d?.id || dj?.dataContract?.$id

      let apps = client.getApps()

      apps.set(CONTRACT_APP_NAME, {
        contractId: Dash.PlatformProtocol.Identifier.from(alphaContractId),
        contract: d,
      })

      console.log('Registered apps:', apps)

      await updateUI({ idents: [alphaIdentityId] })

      client.disconnect()

      window.alphaWalletClientOpts = genWalletClient(
        alphaMnemonic,
        alphaContractId,
        CONTRACT_APP_NAME
      )

      client = new Dash.Client(alphaWalletClientOpts)

      // return apps
    })
)

generateButton(
  'subdoc',
  () => submitDoc()
    .then(pd => {
      console.log('genbtn subdoc', pd, pd.toJSON())
      let d = pd.transitions[0]

      document.querySelector('table.docs tbody')
        .insertAdjacentHTML(
          'afterbegin',
          `<tr>
            <td>${d.type}</td>
            <td>${d.revision ?? 'pending'}</td>
            <td>${d.data.message}</td>
          </tr>`
        )

      document.subdoc.elements.msg.value = ''
    })
)
