# Dash Chum
### a simple HTML, CSS & JS test kit for [Dash Mate](https://github.com/dashpay/platform/tree/v0.23.0-alpha.7/packages/dashmate)

### System Prerequisites
Make sure you have Docker, Node.js & `dashmate` installed

Follow the instructions [at this link](https://docs.dash.org/en/stable/masternodes/setup-testnet.html?highlight=dashmate#dashmate-installation) or the ones below

```sh
# Linux / Mac Setup
curl -fsSL https://get.docker.com -o get-docker.sh && sh ./get-docker.sh
sudo usermod -aG docker $USER # adds the docker group to your user
newgrp docker # a workaround, alternatively logout / restart
curl -sS https://webi.sh/node@16 | sh # installs node.js
source ~/.config/envman/PATH.env
npm i -g dashmate@0.23-alpha
dashmate setup local # won't work if newgrp / logout step is skipped
dashmate group start
```
**DO NOT USE** `snap` to install Docker on Ubuntu. [^1]


### Configuration
You have two options for this stage. You can...

1. Open up `config.js` and replace all occurences of `dashmate` with the IP address, `localhost` or a domain pointing to wherever you're running `dashmate`
2. Modify your `hosts` file (`vim /etc/hosts` on linux) and add an alias for `dashmate`
    - `127.0.0.1  dashmate`

### Install this project

```sh
cd dashchum # change to this repo
npm install # install packages
npm start # run test server
```
Navigate to [http://localhost:5555/](http://localhost:5555/)

### Usage
To generate an identity, a contract or submit a document, you need to add funds to your wallet. That can be accomplished with the commands below.

```sh
# Get the balance of the dashmate seed node
docker exec -it dash_masternode_local_seed-core-1 dash-cli getbalance

# Send 100 dash from the seed node to your wallet
# Copy the Address from the first row in the table
docker exec -it dash_masternode_local_seed-core-1 dash-cli sendtoaddress "yMbdOiNzOCNKlJwj530ir7aJ4DtjFqVejz" 100
```

### Reset `dashmate`
You will likely find the need to reset [^2] your dashmate (perhaps daily), this is a helper script that should get you a fresh version.

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

[^2]: if you see PoSe Penalty errors, you may need to reset your `dashmate` setup