# Dash Chum
### a simple HTML, CSS & JS test kit for [Dash Mate](https://github.com/dashpay/platform/tree/v0.23.0-alpha.7/packages/dashmate)

> A lot of the work that went in to making this repo has been streamed and is available in this [Dash Chum YouTube Playlist](https://youtube.com/playlist?list=PLYU0okGwK--I0xm22OqLl6wjGUTmx-afP)

The instructions below are meant to give you a working local [Dash](https://www.dash.org/) testnet / devnet. The purpose of which is to allow building on the Dash platform without needing to use real Dash.

This gives you a siloed Dash network and generates a wallet unique to your locally running network. You fund it via the Seed Node generated from `dashmate` (see [Usage](#usage)).


## Getting Started
### System Prerequisites
You will need to install Docker, Node.js & `dashmate`, which can be achieved with the instructions below.

#### Docker & Node.js Installation
```sh
# Linux / Mac Setup
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

#### `dashmate` Installation & Setup
```sh
# Install Dashmate
npm i -g dashmate@0.23-alpha

# Setup Dashmate
# won't work if newgrp / logout step is skipped
dashmate setup local
dashmate group start
```
The official method from the [Testnet Masternode Dash Docs](https://docs.dash.org/en/stable/masternodes/setup-testnet.html?highlight=dashmate#dashmate-installation) also works, but was a little outdated at time of writing (Oct 2022).

**DO NOT USE** `snap` to install Docker on Ubuntu. See references [^1][^2]


### Configuration
You have two options for this stage. You can...

1. Open up `config.js` and replace all occurences of `dashmate` with the IP address, `localhost` or a domain pointing to wherever you're running `dashmate`
2. Modify your `hosts` file (`vim /etc/hosts` on linux) and add an alias for `dashmate`
    - `127.0.0.1  dashmate`

### Clone & Install this project

```sh
git clone https://github.com/dashhive/dashchum.git
cd dashchum # change to this repo
npm install # install packages
npm start # run test server
```
Navigate to [http://localhost:5555/](http://localhost:5555/)

### Usage
Once your wallet is setup (which should happen just by loading [http://localhost:5555/](http://localhost:5555/) in your browser) you will need to add funds to it to generate an identity, a contract or submit a document.

That can be accomplished with the commands below.

```sh
# Get the balance of the dashmate seed node
docker exec -it dash_masternode_local_seed-core-1 dash-cli getbalance

# Send 100 dash from the seed node to your wallet
# Copy the Address from the first row in the table (in your browser)
docker exec -it dash_masternode_local_seed-core-1 dash-cli sendtoaddress "yMbdOiNzOCNKlJwj530ir7aJ4DtjFqVejz" 100
```

### Reset `dashmate`
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

### Notes
[^1]: **DO NOT USE** `snap` to install Docker on Ubuntu. It may be hard / impossible to get docker working properly with `dashmate` without formatting your system and re-installing.

[^2]: Snap was a bad choice. https://youtu.be/V-0vEbE_INU?t=188

[^3]: if you see PoSe Penalty errors, you may need to reset your `dashmate` setup