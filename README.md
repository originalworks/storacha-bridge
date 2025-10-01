# Storacha bridge

## Setup
To install simply run `npm install`

## Test
To run tests you need to run `docker-compose -f docker/test-runner.yaml test-runner bash` and then `npm run test`. After you're done remember to shut down containers with `docker-compose -f docker/test-runner.yaml down --remove-orphans`

## Local
To run this setup locally (ganache + live storacha) run `docker-compose -f docker/test-runner.yaml up local`. Docker will run build, run migrations and deploy fixture to ganache.
Before you do that make sure to pass these env variables in docker-compose:
- LOCAL_STORACHA_KEY: Your storacha private key goes here
- LOCAL_OWEN_PROOF: Your proof for space for Owens
- LOCAL_VALIDATOR_PROOF: Your proof for space for Validator1
There are no deterministic deployments so to preserve contract addresses make sure that fixuture is fired first. 

## Storacha crash course
To get to the web ui login with an email to https://console.storacha.network/.

To use CLI install latest version that is stated in https://docs.storacha.network/.
Login is the same as to the web UI.

Each storacha participant is called agent. Every agent has DID key that is derived from private key.
Main account that is responsible for billing is associated with an email, it's DID can be found at https://console.storacha.network/space/import after logging.

Backend has it's own dedicated agent with DID and private key (can be found in AWS) but has no association with storacha (has no storacha account).
In order to make it work, main account needs to create UCAN delegation for backend agent for every space that it will be able to upload to.

This can be achieved through UI but it's easier using CLI:
- `storacha login` will ask you to open a link from an email
- `storacha space ls` will list all spaces that main account has delegations to
- `storacha space use <spaceName/spaceDID>` will set space context for delegations 
- `storacha delegation create <backendAgentDID> --base64` outputs base64 encoded proof that can be used by backend agent. 

Proof then needs to be added to the database and associated it with 0x address that can upload to this space. In other words DataProvider A will always send DdexMessages
using 0xABC, so in storacha bridge we need to associate space dedicated for DataProvider A with this 0x address.

