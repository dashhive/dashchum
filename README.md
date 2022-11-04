# Dash Chum
### a simple HTML, CSS & JS test kit for [Dash Mate](https://github.com/dashpay/platform/tree/v0.23.0-alpha.7/packages/dashmate)

> A lot of the work that went in to making this repo has been streamed and is available in this [Dash Chum YouTube Playlist](https://youtube.com/playlist?list=PLYU0okGwK--I0xm22OqLl6wjGUTmx-afP)

The instructions below are meant to give you a working local [Dash](https://www.dash.org/) testnet / devnet. The purpose of which is to allow building on the Dash platform without needing to use real Dash (Ð).

This gives you a siloed Dash network and generates a wallet unique to your locally running network. You fund it via the Seed Node generated from [Dashmate](https://github.com/dashpay/platform/tree/v0.23.0-alpha.7/packages/dashmate) (see [Usage](#usage)).

## Purpose

The purpose of this project is to test [Dashmate](https://github.com/dashpay/platform/tree/v0.23.0-alpha.7/packages/dashmate) and the [Dash Platform](https://dashplatform.readme.io/docs/tutorial-create-and-fund-a-wallet), centered around implementing functional examples of the tutorials at https://dashplatform.readme.io/docs/tutorials-introduction

Once your system is setup with Docker, Node.js & Dashmate running correctly, Dash Chum should allow testing the following functionality:

- Generating a Wallet (automatically happens on page load)
- [Funding the new wallet](#funding-your-wallet) via `dash-cli`

#### Once your wallet is funded, these buttons will appear with the available next steps
- Generate Identity (appears once wallet is funded)
- Generate Contract (appears once Identity is created)
- Submit Document (appears once contract is created)


## Getting Started
### System Prerequisites
* [Docker](https://docs.docker.com/engine/installation/) (v20.10+)
* [Node.js](https://nodejs.org/en/download/) (v16.0+, NPM v8.0+)
* [Dashmate](https://github.com/dashpay/platform/tree/v0.23.0-alpha.7/packages/dashmate) (v0.23.0-alpha.7)

You will need to install Docker, Node.js & `dashmate`, which can be achieved with the instructions below.

#### Docker & Node.js Installation - Linux
```sh
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh ./get-docker.sh

# adds the docker group to your user
sudo usermod -aG docker $USER

# a workaround, alternatively logout / restart
newgrp docker

# Install Node.js
curl -sS https://webi.sh/node@16 | sh
source ~/.config/envman/PATH.env
```

If you skip the steps above (perhaps you already have them installed) and run into any issues with the `dashmate` setup, you may need to re-install Docker or Node.js.

#### Dashmate Installation & Setup
```sh
# Install Dashmate
npm i -g dashmate@0.23-alpha

# Setup Dashmate
# won't work if newgrp / logout step is skipped

# if either of these steps fail,
# try re-running each once or twice
dashmate setup local
dashmate group start
```
The official method from the [Testnet Masternode Dash Docs](https://docs.dash.org/en/stable/masternodes/setup-testnet.html?highlight=dashmate#dashmate-installation) also works, but was a little outdated at time of writing (Oct 2022).

***WARNING*** **DO NOT USE** `snap` to install Docker on Ubuntu. See references [^1][^2]


### Configuration
You have two options for this stage. You can...

1. Open up `config.js` and replace all occurences of `dashmate` with the IP address (Eg. `127.0.0.1` or `192.168.1.1`), `localhost` or a domain pointing to wherever you're running Dashmate.

#### or

2. Modify your `hosts` file and add an alias for `dashmate`

```sh
sudo vim /etc/hosts

# add a line to the bottom of the file like so
127.0.0.1  dashmate

# save and quit (:wq)
```

### Clone & Install this project

```sh
git clone https://github.com/dashhive/dashchum.git
cd dashchum # change to this repo
npm install # install packages
npm start # run test server
```
Navigate to [http://localhost:5555/](http://localhost:5555/)

### Funding your wallet
Once your wallet is setup (which should happen just by loading [http://localhost:5555/](http://localhost:5555/) in your browser) you will need to add funds to it to generate an identity, a contract or submit a document.

That can be accomplished with the commands below.

```sh
# Get the balance of the dashmate seed node
docker exec -it dash_masternode_local_seed-core-1 dash-cli getbalance

# Send 100 dash from the seed node to your wallet
# Copy the Address from the first row in the table (in your browser)
docker exec -it dash_masternode_local_seed-core-1 dash-cli sendtoaddress "REPLACE_WITH_ADDRESS_FROM_BROWSER" 100

# replace "REPLACE_WITH_ADDRESS_FROM_BROWSER" with the address from http://localhost:5555
# it should look like "yMbdOiNzOCNKlJwj530ir7aJ4DtjFqVejz"
```

### Reset Dashmate
You will likely find the need to reset [^3] your dashmate (perhaps daily), this is a helper script that should get you a fresh version.

```sh
#!/bin/sh
dashmate group stop
# docker stop $(docker ps -q) # in some scenarios this may be needed
docker system prune -f
docker volume prune -f
rm -rf ~/.dashmate
dashmate setup local
```

### Stop Dashmate when not in use

Dashmate can take up a bit of system resources and can begin throwing errors the longer it runs. Consider stopping the services while its not in use.

```sh
# this should stop all the docker services
dashmate group stop

# just run this when you want to get going again
dashmate group start
```

### Notes
[^1]: **DO NOT USE** `snap` to install Docker on Ubuntu. It may be hard / impossible to get docker working properly with `dashmate` without formatting your system and re-installing.

[^2]: Snap was a bad choice. https://youtu.be/V-0vEbE_INU?t=188

[^3]: if you see PoSe Penalty errors, you may need to reset your `dashmate` setup