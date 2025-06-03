# Storacha bridge

## Setup
To install simply run `npm install`

# Test
To run tests you need to run `docker-compose -f docker/test-runner.yaml test-runner bash` and then `npm run test`. After you're done remember to shut down containers with `docker-compose -f docker/test-runner.yaml down --remove-orphans`

# Local
To run this setup locally (ganache + live storacha) run `docker-compose -f docker/test-runner.yaml up local`. Docker will run build, run migrations and deploy fixture to ganache.
Before you do that make sure to pass these env variables in docker-compose:
- LOCAL_STORACHA_KEY: Your storacha private key goes here
- LOCAL_OWEN_PROOF: Your proof for space for Owens
- LOCAL_VALIDATOR_PROOF: Your proof for space for Validator1
There are no deterministic deployments so to preserve contract addresses make sure that fixuture is fired first. 