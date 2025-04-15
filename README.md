# Storacha bridge

## Setup
To install simply run `npm install`

Env config:
TEMP_PATH - path to folder where app will create /uploads folder and process files there. After each request processed files are being removed,
STORACHA_KEY - Base64-encoded Ed25519 private key representing the app. Used to authenticate with Web3.Storage via UCAN. See more here: https://docs.storacha.network/how-to/upload/#bring-your-own-delegations
STORACHA_PROOF - Base64-encoded UCAN delegation that grants the app permission to upload to a specific Web3.Storage space. See more here: https://docs.storacha.network/how-to/upload/#bring-your-own-delegations
RPC_URL - Self explanatory,
DDEX_SEQUENCER_ADDRESS - Address of Sequencer contract. The app will take whitelists addresses from it.

# Test
To run tests you need to run `docker-compose -f docker/test-runner.yaml test-runner bash` and then `npm run test`. After you're done remember to shut down containers with `docker-compose -f docker/test-runner.yaml down --remove-orphans`