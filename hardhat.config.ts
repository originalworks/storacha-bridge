import { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: { evmVersion: 'cancun' },
  },
  networks: {
    hardhat: {
      loggingEnabled: false,
    },
  },
};

export default config;
