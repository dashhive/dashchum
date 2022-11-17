// import Dash from 'dash'
// import Dash from './node_modules/dash/dist/dash.min.js'
// import Dash from './node_modules/dash/build/src/index.js'

/**
 * @typedef {import('dash')} Dash
 */

import {
  // baseClientOpts,
  genWalletClient,
} from './config.js'

const CONTRACT_APP_NAME = 'chumApp'

let storedMnemonic = localStorage.getItem(dashnet+'_mnemonic')
let storedAddress = localStorage.getItem(dashnet+'_address')
let storedIdentityId = localStorage.getItem(dashnet+'_identity_id')
let storedContractId = localStorage.getItem(dashnet+'_contract_id')
let storedUserId = localStorage.getItem(dashnet+'_user_id')
let storedUserName = localStorage.getItem(dashnet+'_username')

window.storedWalletClientOpts = genWalletClient(
  storedMnemonic,
  storedContractId,
  CONTRACT_APP_NAME,
  dashNetwork,
  currentHeight
)

console.log('window.storedWalletClientOpts', window.storedWalletClientOpts)

let client // = new Dash.Client(storedWalletClientOpts)

// window.dashClient = client

const SAT = 100000000


let table = document.querySelector('table')
// let tbody = table.querySelector('table > tbody')
let userBalanceEl = document.querySelector('header > figure > figcaption')
let addrEl = document.querySelector('article.addr')
let POLL_INTERVAL

dashNetwork = localStorage.getItem('network') || 'testnet'
dashnet = getNetworkType(dashNetwork)

document.dashnet.net.addEventListener(
  'change',
  () => changeNetwork(null, async (netChange) => {
    await client?.disconnect()

    dashNetwork = netChange.dashNetwork
    dashnet = netChange.dashnet
    currentHeight = dashnet === 'test' ? 834431 : 1

    storedMnemonic = localStorage.getItem(dashnet+'_mnemonic')
    storedAddress = localStorage.getItem(dashnet+'_address')
    storedIdentityId = localStorage.getItem(dashnet+'_identity_id')
    storedContractId = localStorage.getItem(dashnet+'_contract_id')
    storedUserId = localStorage.getItem(dashnet+'_user_id')
    storedUserName = localStorage.getItem(dashnet+'_username')

    window.storedWalletClientOpts = genWalletClient(
      storedMnemonic,
      storedContractId,
      CONTRACT_APP_NAME,
      dashNetwork,
      currentHeight
    )

    console.log('window.storedWalletClientOpts', window.storedWalletClientOpts)

    await initUI()
  })
)

document.dashnet.host.addEventListener(
  'change',
  e => localStorage.setItem('network', e.target.value)
)

// function getNetworkType(netType = dashNetwork) {
//   return netType === 'testnet' ? 'test' : 'dev'
// }

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
      currentHeight = d.chain.blocksCount
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

function setMessage(msg, className) {
  let msgEl = document.querySelector(`.msg`)
  msgEl.classList.value = 'msg'

  if (className) {
    msgEl.classList.add(className)
  }

  msgEl.innerHTML = msg
}

function docTable(rows) {
  return `
    <thead align="center">
      <tr><td colspan="4">Documents</td></tr>
      <tr><td width="15%">type</td><td width="15%">revision</td><td>value</td><td>ctrl</td></tr>
    </thead>
    <tbody>${rows}</tbody>
  `
}

async function updateUI({ mnemonic, address, acctBalance, prettyBalance, idents, }) {
  let docList = document.querySelector('form[name="subdoc"] + table')
  docList = docList?.remove()
  toggleForm('subdoc', false)

  if (mnemonic && address && prettyBalance) {
    addrEl.innerHTML = `<div>Unused Address:</div>${address}`
    userBalanceEl.innerHTML = `<sub>Ð${prettyBalance}</sub>`
    toggleForm('funds2address', true)
  }

  console.log(
    'updateUI show generate identity btn',
    idents?.length === 0,
    { idents, acctBalance, dashNetwork }
  )

  if (idents?.length === 0) {
    if (acctBalance > 0) {
      toggleForm('genident', true)
    } else {
      toggleForm('genident', false)
      if (dashNetwork !== 'testnet') {
        setMessage(`
          <p>You must fund your wallet before proceeding, see <a href="https://github.com/dashhive/dashchum#funding-your-wallet">Dash Chum docs</a> for instructions or copy & paste the command below in your terminal.</p>

          <pre><code><span class="dem">docker exec -it dash_masternode_local_seed-core-1</span> dash-cli <em>sendtoaddress</em> <address>"${address}"</address> <output>100</output></code></pre>
        `)
      } else {
        setMessage(`
          <p>You must fund your wallet before proceeding. Go to <a href="https://testnet-faucet.dash.org/">https://testnet-faucet.dash.org/</a> or <a href="http://faucet.testnet.networks.dash.org/">http://faucet.testnet.networks.dash.org/</a> and request 10+ Dash to your new address (${address}).</p>
        `)
      }
    }
  }

  if (!storedIdentityId && idents?.[0]) {
    localStorage.setItem(dashnet+'_identity_id', idents[0])
    storedIdentityId = idents[0]
    // toggleForm('genident', false)
  }

  console.log('updateUI', { idents, storedContractId })

  if (idents?.length > 0) {
    toggleForm('genident', false)

    // toggleForm('topup')

    if (!storedContractId) {
      toggleForm('subdoc', false)
      toggleForm('regname', false)
      toggleForm('gencon', true)
    } else {
      toggleForm('gencon', false)
      toggleForm('subdoc', true)

      retrieveContract()
        .then(async (d) => {
          console.log('retrieve data contract', d, docList)
          // console.dir(d?.toJSON(), { depth: 5 })

          if (!docList) {
            docList = document.createElement('table')

            docList.classList.add('docs')

            document.querySelector('form[name="subdoc"]')
              .insertAdjacentElement('afterend', docList)
          }

          docList.innerHTML = docTable('')

          if (d?.id) {
            await client.getApps().set(CONTRACT_APP_NAME, {
              contractId: Dash.PlatformProtocol.Identifier.from(d.id), // d?.id || d?.dataContract?.id
              contract: d,
            })

            getDocuments()
              .then((d) => {
                console.log('Get Documents:\n', d);

                let docs = d.map(n => {
                  let nj = n.toJSON()
                  return `<tr id="docid-${nj.$id}">
                    <td>${nj.$type}</td>
                    <td>${nj.$revision}</td>
                    <td>${nj.message}</td>
                    <td>
                      <form>
                        <input name="docid" type="hidden" value=${nj.$id} />
                        <button type="submit">X</button>
                      </form>
                    </td>
                  </tr>`
                })

                let docListBody = document.querySelector('form[name="subdoc"] + table > tbody')

                if (docListBody) {
                  docListBody.innerHTML = docs.join('\n')
                }
              })
              .catch((e) => console.error('Something went wrong:\n', e))
          }
        })
        .catch((e) => console.error('Something went wrong:\n', e))
    }

    for(let iid of idents) {
      let ident = await client.platform.identities.get(iid)
      let uniqueNames = await client.platform.names.resolveByRecord(
        'dashUniqueIdentityId',
        iid,
      )
      let aliases = await client.platform.names.resolveByRecord(
        'dashAliasIdentityId',
        iid,
      )
      console.log('Identity', iid, ident, uniqueNames, aliases)

      let nameJson = uniqueNames?.[0]?.toJSON()
      let aliasesJson = aliases?.map(a => a?.toJSON())

      console.log('Identity JSON', nameJson, aliasesJson)

      if (nameJson?.label) {
        userBalanceEl.innerHTML = `
          <span>@${nameJson?.label}</span><br>
          <sub>Ð${prettyBalance}</sub>
        `
        toggleForm('funds2user', true)

        // toggleForm('regname', false)
        document.regname.querySelector('input').setAttribute('placeholder', 'YourSuperCoolAlias')
        document.regname.querySelector('button').textContent = 'Register Alias'
      } else {
        toggleForm('regname', true)
      }

      if (!document.getElementById(`rid-${iid}`)) {
        userBalanceEl
          .insertAdjacentHTML(
            'beforeend',
            `<br><sup>¢💳${new Intl.NumberFormat().format(ident.balance)}</sup>`
          )
      //   tbody.insertAdjacentHTML(
      //     'beforeend',
      //     `<tr id="rid-${iid}">
      //       <td>${new Intl.NumberFormat().format(ident.balance)}</td>
      //       <td>
      //         ${iid}
      //         ${aliasesJson?.map(a => `@${a?.label}`).join('<br>')}
      //       </td>
      //     </tr>`
      //   )
      }
    }
  }
}

async function pollWalletStatus() {
  POLL_INTERVAL = setInterval(() => {
    getWalletBalance()
  }, 5000)
}

function on(chain, event, cb = info => console.info(event, info)) {
  chain.on(
    event,
    cb
  )
}

function won(chain, event) {
  on(
    chain,
    Dash.WalletLib.EVENTS[event],
  );
}

async function addWalletByMnemonic(event) {
  setMessage('')

  let existingWallet = event?.target?.mnemonic?.value
  let validMnemonic = false

  try {
    validMnemonic = Dash.Core.Mnemonic.isValid(existingWallet)
  } catch (err) {
    validMnemonic = false
  }

  console.log('addWalletByMnemonic', dashnet+'_mnemonic', { existingWallet, validMnemonic })

  if (existingWallet && validMnemonic) {
    localStorage.setItem(dashnet+'_mnemonic', existingWallet)
    storedMnemonic = existingWallet

    window.storedWalletClientOpts = genWalletClient(
      storedMnemonic,
      storedContractId,
      CONTRACT_APP_NAME,
      dashNetwork,
      currentHeight
    )

    console.log('window.storedWalletClientOpts', window.storedWalletClientOpts)

    return await initUI()
  }

  console.log('mnemonic is invalid', { existingWallet, validMnemonic })
}

async function getWalletBalance() {
  setMessage('')

  // on(client, 'CHAIN_STATUS_SYNC')
  // on(client.getDAPIClient(), 'CHAIN_STATUS_SYNC')
  // // on(client.getDAPIClient().core, 'CHAIN_STATUS_SYNC')
  // on(client, 'HISTORICAL_SYNC')
  // on(client.getDAPIClient(), 'HISTORICAL_SYNC')
  // on(client, 'CONTINUOUS_SYNC')
  // on(client.getDAPIClient(), 'CONTINUOUS_SYNC')

  // won(client, 'GENERATED_ADDRESS')
  // won(client, 'CONFIRMED_BALANCE_CHANGED')
  // won(client, 'UNCONFIRMED_BALANCE_CHANGED')
  // won(client, 'PREFETCHED')
  // won(client, 'DISCOVERY_STARTED')
  // won(client, 'CONFIGURED')
  // won(client, 'REHYDRATE_STATE_FAILED')
  // won(client, 'REHYDRATE_STATE_SUCCESS')
  // won(client, 'FETCHED_CONFIRMED_TRANSACTION')
  // won(client, 'TX_METADATA')
  // won(client, 'BLOCKHEIGHT_CHANGED', info => {
  //   console.info('BLOCKHEIGHT_CHANGED', info)
  //   currentHeight = info?.payload
  // })
  // won(client, 'BLOCKHEADER')
  // won(client, 'BLOCK')
  won(client.wallet, 'HISTORICAL_DATA_OBTAINED')
  // won(client.wallet.transport, 'HISTORICAL_DATA_OBTAINED')

  console.log('client wallet', client.wallet)

  const account = await client.getWalletAccount()

  // on(account, 'CHAIN_STATUS_SYNC')
  // on(account, 'HISTORICAL_SYNC')
  // on(account, 'CONTINUOUS_SYNC')
  // won(account, 'GENERATED_ADDRESS')
  // won(account, 'CONFIRMED_BALANCE_CHANGED')
  // won(account, 'UNCONFIRMED_BALANCE_CHANGED')
  // won(account, 'PREFETCHED')
  // won(account, 'DISCOVERY_STARTED')
  // won(account, 'CONFIGURED')
  // won(account, 'REHYDRATE_STATE_FAILED')
  // won(account, 'REHYDRATE_STATE_SUCCESS')
  // won(account, 'FETCHED_UNCONFIRMED_TRANSACTION')
  // won(account, 'FETCHED_CONFIRMED_TRANSACTION')
  // won(account, 'TX_METADATA')
  // won(account, 'HISTORICAL_DATA_OBTAINED')
  won(account, 'BLOCKHEIGHT_CHANGED', info => {
    console.info('BLOCKHEIGHT_CHANGED', info)
    currentHeight = info?.payload
  })
  won(account, 'BLOCKHEADER')
  won(account, 'BLOCK')

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

  if (!storedMnemonic) {
    localStorage.setItem(dashnet+'_mnemonic', mnemonic)
    storedMnemonic = mnemonic
  }

  if (address !== storedAddress) {
    localStorage.setItem(dashnet+'_address', address)
    storedAddress = address
  }

  await updateUI({ mnemonic, address, acctBalance, prettyBalance, idents, })

  getApps()
    .then((d) => {
      console.log('get apps', d)
    })
    .catch((e) => console.error('Something went wrong:\n', e))

  // Handle wallet async errors
  client.on('error', (error, context) => {
    console.error(`Client error: ${error.name}`)
    console.error(context)
  })

  return await client
}

async function createIdentity() {
  setMessage('')
  let tmpWA = await client.getWalletAccount()

  console.log(
    'createIdentity getWalletAccount',
    tmpWA
  )

  let tmpIDS = await tmpWA.identities.getIdentityIds()

  console.log(
    'createIdentity getIdentityIds',
    tmpIDS
  )

  const newIdentity = await client.platform.identities.register()

  console.log('newIdentity:', newIdentity)

  const jsonIdent = newIdentity.toJSON()

  console.log('jsonIdent:', jsonIdent)

  localStorage.setItem(dashnet+'_identity_id', jsonIdent.id)
  storedIdentityId = jsonIdent.id

  // if (newIdentity) {
  //   toggleForm('genident')
  // }

  // tbody.insertAdjacentHTML(
  //   'beforeend',
  //   `<tr>
  //     <td>${new Intl.NumberFormat().format(newIdentity.balance)}</td>
  //     <td>${jsonIdent.id}</td>
  //   </tr>`
  // )

  await updateUI({ idents: [jsonIdent.id], })

  return client
}

async function topupIdentity() {
  const topUpAmount = 1500;

  await client.platform.identities.topUp(storedIdentityId, topUpAmount);
  return client.platform.identities.get(storedIdentityId);
}

async function sendFunds(event) {
  let { name, to, amount } = event.target

  console.log(
    'send funds to',
    to.value,
    amount.value,
    name,
  )

  if (name === 'funds2address') {
    const account = await client.getWalletAccount();

    const transaction = account.createTransaction({
      recipient: to.value, // Testnet2 faucet
      satoshis: amount.value * SAT, // 1 Dash
    });

    return account.broadcastTransaction(transaction);
  }

  if (name === 'funds2user') {
    let resolvedUser = await retrieveName(to.value)

    console.log('resolved user', resolvedUser, resolvedUser.toJSON())

    let userIdentity = await client.platform.identities.get(
      resolvedUser.ownerId.toString()
    )

    console.log('user identity', userIdentity, userIdentity.toJSON())

    return { resolvedUser, userIdentity, }
  }
}

const retrieveName = async (user) => {
  if (!user) return
  // Retrieve by full name (e.g., myname.dash)
  return client.platform.names.resolve(`${user}.dash`);
}

async function registerName() {
  setMessage('')

  let name = document.regname?.elements?.user?.value

  let userQuery = await retrieveName(name)

  console.log(
    'registerName userQuery',
    name,
    userQuery
  )

  if (userQuery !== null) {
    return false
  }

  let uniqueUserID = await client.platform.names.resolveByRecord(
    'dashUniqueIdentityId',
    storedIdentityId,
  )

  const identity = await client.platform.identities.get(storedIdentityId);

  let regType = {
    [
      uniqueUserID?.length > 0 ?
        'dashAliasIdentityId' :
        'dashUniqueIdentityId'
    ]: identity.getId()
  }

  const nameReg = await client.platform.names.register(
    `${name}.dash`,
    regType,
    identity,
  );

  return nameReg
}

async function registerContract() {
  setMessage('')
  console.log('reg contract for id', storedIdentityId)
  const identity = await client.platform.identities.get(storedIdentityId)

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
    localStorage.setItem(dashnet+'_contract_id', contract.id)
    storedContractId = contract.id
    console.log('Validation passed, broadcasting contract..')
    // Sign and submit the data contract
    return await client.platform.contracts.publish(contract, identity)
  }

  console.error(validationResult) // An array of detailed validation errors
  throw validationResult.errors[0]
}

async function retrieveContract() {
  if (!storedIdentityId || !storedContractId) {
    throw { storedIdentityId, storedContractId }
  }
  return await client.platform.contracts.get(storedContractId)
}

async function subOrModDoc(docObj) {
  setMessage('')

  const {
    id = null,
    message = document.subdoc?.msg?.value,
    time = new Date().toUTCString(),
  } = docObj

  const identity = await client.platform.identities.get(storedIdentityId);

  console.log('submitDoc', { docObj })

  if (id && !message) {
    const [doc] = await client.platform.documents.get(
      `${CONTRACT_APP_NAME}.note`,
      { where: [['$id', '==', id]] },
    );

    // Sign and submit the document delete transition
    return client.platform.documents.broadcast({ delete: [doc] }, identity);
  }

  if (id && message) {
    const [doc] = await client.platform.documents.get(
      `${CONTRACT_APP_NAME}.note`,
      { where: [['$id', '==', id]] },
    );

    doc.set('message', `${
      message
    } @ ${
      time
    }`);

    // Sign and submit the document delete transition
    return client.platform.documents.broadcast({ replace: [doc] }, identity);
  }

  const docProperties = {
    message: `${
      message
    } @ ${
      time
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
    // replace: [], // Document(s) to update
    // delete: [], // Document(s) to delete
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

function genBtnHandler(name, callback) {
  return event => {
    event.preventDefault()
    console.log(`form generate ${name} submit`, event)

    callback(event)
      .catch((e) => console.error('Something went wrong:\n', e))
  }
}

function generateButton(name, callback = () => {}) {
  let generatedButton = document.querySelector(`form[name="${name}"]`)

  generatedButton?.addEventListener('submit', genBtnHandler(name, callback))

  return generatedButton
}

async function initUI() {
  if (!storedMnemonic) {
    setMessage(`
      <p>Enter a Testnet Wallet Mnemonic</p>
      <form name="usewallet">
        <input name="mnemonic" placeholder="Enter your testnet seed phrase (mnemonic)" />
        <button type="submit">Open Wallet</button>
      </form>

      <h3>OR</h3>

      <form name="genwallet">
        <button type="submit">Generate New Wallet</button>
      </form>
    `, 'center')

    generateButton(
      'usewallet',
      addWalletByMnemonic
    )

    generateButton(
      'genwallet',
      () => reloadUI()
    )

    return
  }

  await reloadUI()
}

async function reloadUI() {
  document.querySelectorAll('form:not([name="dashnet"])').forEach(element => {
    element.parentNode.replaceChild(element.cloneNode(true), element);
  })

  document.body.addEventListener('submit', async event => {
    event.preventDefault()
    let docId = event.target.docid?.value
    console.log(`submit form`, event.target.name, docId)
    if (!event.target.name && docId) {
      // removeDoc
      await subOrModDoc({ id: docId, message: false })
        .then(res => {
          console.log('document deleted', docId, res)
          document.getElementById(`docid-${docId}`)?.remove()
        })
    }
  })

  client = new Dash.Client(storedWalletClientOpts)

  window.dashClient = client

  userBalanceEl.innerHTML = ''

  getBestBlock()

  getChainStatus()

  getWalletBalance()

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
    'funds2address',
    event => sendFunds(event)
      .then(res => {
        console.log('sent funds to address', res)
      })
  )

  generateButton(
    'funds2user',
    event => sendFunds(event)
      .then(res => {
        console.log('sent funds to user', res)
      })
  )

  generateButton(
    'gencon',
    () => registerContract()
      .then(async d => {
        let dj = d?.toJSON()

        console.log('Contract registered:', d, dj)
        localStorage.setItem(dashnet+'_contract_id', d?.id || dj?.dataContract?.$id)
        storedContractId = d?.id || dj?.dataContract?.$id

        let apps = client.getApps()

        apps.set(CONTRACT_APP_NAME, {
          contractId: Dash.PlatformProtocol.Identifier.from(storedContractId),
          contract: d,
        })

        console.log('Registered apps:', apps)

        await updateUI({ idents: [storedIdentityId] })

        client.disconnect()

        window.storedWalletClientOpts = genWalletClient(
          storedMnemonic,
          storedContractId,
          CONTRACT_APP_NAME,
          dashNetwork,
          currentHeight,
        )

        client = new Dash.Client(storedWalletClientOpts)

        // return apps
      })
  )

  generateButton(
    'regname',
    () => registerName()
      .then(un => {
        if (!un) {
          console.log('Username conflict')
          return
        }
        let unj = un.toJSON()

        console.log('Username registered:', un, unj)

        localStorage.setItem(dashnet+'_user_id', unj?.$id)
        localStorage.setItem(dashnet+'_username', unj?.label)

        storedUserId = unj.$id
        storedUserName = unj.label

        if (unj?.label) {
          userBalanceEl
            .insertAdjacentHTML(
              'afterbegin',
              `<span>@${unj?.label}</span><br>`
            )
          // .innerHTML =

          toggleForm('regname', false)
          document.regname.querySelector('input').setAttribute('placeholder', 'YourSuperCoolAlias')
          document.regname.querySelector('button').textContent = 'Register Alias'
        }

        document.regname.elements.user.value = ''
      })
  )

  generateButton(
    'subdoc',
    () => subOrModDoc({ message: document.subdoc?.msg?.value, })
      .then(pd => {
        let d = pd.transitions[0]
        let pdj = pd.toJSON()
        let pdt = pdj.transitions[0]
        console.log('genbtn subdoc', pd, pdj)

        document.querySelector('table.docs tbody')
          .insertAdjacentHTML(
            'afterbegin',
            `<tr id="docid-${pdt.$id}">
              <td>${pdt.$type}</td>
              <td>${pdt.$revision ?? 'processing'}</td>
              <td>${pdt.message}</td>
              <td>
                <form>
                  <input name="docid" type="hidden" value=${pdt.$id} />
                  <button type="submit">X</button>
                </form>
              </td>
            </tr>`
          )

        document.subdoc.elements.msg.value = ''
      })
  )
}

await initUI()