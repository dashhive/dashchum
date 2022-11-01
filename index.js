// import Dash from 'dash'

import {
  baseClientOpts,
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

const baseClient = new Dash.Client(baseClientOpts)
const client = new Dash.Client(alphaWalletClientOpts)

const SAT = 100000000

let table = document.querySelector('table')
let tbody = table.querySelector('table > tbody')

async function getBestBlock () {
  async function connect() {
    return await baseClient.getDAPIClient().core.getBestBlockHash()
  }

  connect()
    .then((d) => console.log('Connected. Best block hash:\n', d))
    .catch((e) => console.error('Something went wrong:\n', e))
}

async function getChainStatus() {
  async function connect() {
    return await baseClient.getDAPIClient().core.getStatus()
  }

  connect()
    .then((d) => {
      console.log('Connected. Current Block Height:\n', d.chain.blocksCount)
      console.log('Connected. Chain Status:\n', d)
    })
    .catch((e) => console.error('Something went wrong:\n', e))
}

function toggleForm(name) {
  document.querySelector(`form[name="${name}"]`)?.classList.toggle('hide')
}

async function getWalletBalance() {
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

  if (!alphaMnemonic) {
    localStorage.setItem('mnemonic', mnemonic)
    alphaMnemonic = mnemonic
  }

  if (address !== alphaAddress) {
    localStorage.setItem('address', address)
    alphaAddress = address
  }

  if (table.classList.contains('hide')) {
    table.classList.remove('hide')
  }

  if (idents.length === 0 && acctBalance > 0) {
    toggleForm('genident')
  } else {
    if (!alphaIdentityId && idents[0]) {
      localStorage.setItem('identity_id', idents[0])
      alphaIdentityId = idents[0]
    }
    toggleForm('topup')

    if (!alphaContractId) {
      toggleForm('gencon')
    } else {
      toggleForm('subdoc')
    }
  }

  tbody.insertAdjacentHTML(
    'beforeend',
    `<tr>
      <td>${prettyBalance}</td>
      <td>${mnemonic}</td>
      <td>${address}</td>
    </tr>`
  )

  for(let iid of idents) {
    let ident = await client.platform.identities.get(iid)
    console.log('Identity', iid, ident)

    tbody.insertAdjacentHTML(
      'beforeend',
      `<tr>
        <td>${new Intl.NumberFormat().format(ident.balance)}</td>
        <td>identity</td>
        <td>${iid}</td>
      </tr>`
    )
  }

  // Handle wallet async errors
  client.on('error', (error, context) => {
    console.error(`Client error: ${error.name}`)
    console.error(context)
  })

  return await client
}

async function createIdentity() {
  console.log('client.platform.identities', await (await client.getWalletAccount()).identities.getIdentityIds())

  const newIdentity = await client.platform.identities.register()
  const jsonIdent = newIdentity.toJSON()

  console.log('Identity:', newIdentity, jsonIdent)
  localStorage.setItem('identity_id', jsonIdent)
  alphaIdentityId = jsonIdent

  if (newIdentity) {
    toggleForm('genident')
  }

  tbody.insertAdjacentHTML(
    'beforeend',
    `<tr>
      <td>${new Intl.NumberFormat().format(newIdentity.balance)}</td>
      <td>identity</td>
      <td>${newIdentity}</td>
    </tr>`
  )

  return client
}

async function topupIdentity() {
  const topUpAmount = 1500;

  await client.platform.identities.topUp(alphaIdentityId, topUpAmount);
  return client.platform.identities.get(alphaIdentityId);
}


async function registerContract() {
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
  if (!alphaContractId) {
    return
  }
  return await client.platform.contracts.get(alphaContractId)
}

async function submitDoc() {
  const identity = await client.platform.identities.get(alphaIdentityId);

  const docProperties = {
    message: `Tinkerer Test @ ${new Date().toUTCString()}`,
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

    callback()
      .catch((e) => console.error('Something went wrong:\n', e))
  })

  return generatedButton
}

getBestBlock()

getChainStatus()

getWalletBalance()

retrieveContract()
  .then(async (d) => {
    console.log('retrieve data contract', d)
    console.dir(d?.toJSON(), { depth: 5 })

    await client.getApps().set(CONTRACT_APP_NAME, {
      contractId: Dash.PlatformProtocol.Identifier.from(d?.id),
      contract: d,
    })

    getDocuments()
      .then((d) => {
        console.log('Get Documents:\n', d);

        let docList = document.createElement('table')

        docList.classList.add('docs')

        let docs = d.map(n => {
          return `<tr>
            <td>${n.type}</td>
            <td>${n.revision}</td>
            <td>${n.data.message}</td>
          </tr>`
        })

        docList.innerHTML = `<thead align="center">
          <tr><td colspan="3">Documents</td></tr>
          <tr><td>type</td><td>revision</td><td>value</td></tr>
        </thead>
        <tbody>${docs.join('\n')}</tbody>`

        document.querySelector('table').insertAdjacentElement('afterend', docList)
      })
      .catch((e) => console.error('Something went wrong:\n', e))
  })
  .catch((e) => console.error('Something went wrong:\n', e))

getApps()
  .then((d) => {
    console.log('get apps', d)
  })
  .catch((e) => console.error('Something went wrong:\n', e))

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
    .then(d => {
      let dj = d?.toJSON()

      console.log('Contract registered:', d, dj)
      localStorage.setItem('contract_id', dj?.dataContract?.$id)
      alphaContractId = dj?.dataContract?.$id

      let apps = client.getApps()
      apps.set(CONTRACT_APP_NAME, {
        contractId: Dash.PlatformProtocol.Identifier.from(d?.dataContract?.id),
        contract: d,
      })
      console.log('Registered apps:', apps)
      return apps
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
    })
)
