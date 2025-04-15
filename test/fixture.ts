import { ethers, Wallet, ZeroAddress } from 'ethers';
import { Whitelist__factory } from '../contracts/whitelist/Whitelist__factory';
import { DdexSequencer__factory } from '../contracts/ddexSequencer/DdexSequencer__factory';
import { ERC1967Proxy__factory } from '../contracts/ERC1967Proxy/ERC1967Proxy__factory';

interface GanacheConfig {
  mnemonic: string;
  rpcUrl: string;
}

const GANACHE_CONFIG: GanacheConfig = {
  mnemonic: process.env.GANACHE_PRIMARY_MNEMONIC,
  rpcUrl: `http://${process.env.GANACHE_PRIMARY_HOST}:${process.env.GANACHE_PORT}`,
};

const createWallets = async (config: GanacheConfig) => {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallets: ethers.HDNodeWallet[] = [];
  const wallet = Wallet.fromPhrase(config.mnemonic, provider);

  for (let i = 0; i < 5; i++) {
    const hdWallet = wallet.deriveChild(i);
    await (
      await wallet.sendTransaction({
        to: hdWallet.address,
        value: ethers.parseEther('1'),
      })
    ).wait();
    wallets.push(hdWallet);
  }

  return wallets;
};

export const testFixture = async () => {
  const [deployer, owen, validator, random] =
    await createWallets(GANACHE_CONFIG);

  const dataProvidersWhitelist = await (
    await new Whitelist__factory(deployer).deploy(deployer.address)
  ).waitForDeployment();

  const validatorsWhitelist = await (
    await new Whitelist__factory(deployer).deploy(deployer.address)
  ).waitForDeployment();

  const sequencerImplementation = await (
    await new DdexSequencer__factory(deployer).deploy()
  ).waitForDeployment();

  const sequencerInitializeArgs = (
    await sequencerImplementation.initialize.populateTransaction(
      await dataProvidersWhitelist.getAddress(),
      await validatorsWhitelist.getAddress(),
      ZeroAddress,
    )
  ).data;

  const sequencerProxy = await (
    await new ERC1967Proxy__factory(deployer).deploy(
      await sequencerImplementation.getAddress(),
      sequencerInitializeArgs,
    )
  ).waitForDeployment();

  await (await dataProvidersWhitelist.addToWhitelist(owen.address)).wait();
  await (await validatorsWhitelist.addToWhitelist(validator.address)).wait();

  return {
    sequencer: sequencerProxy,
    validatorsWhitelist,
    dataProvidersWhitelist,
    rpcUrl: GANACHE_CONFIG.rpcUrl,
    wallets: {
      deployer,
      owen,
      validator,
      random,
    },
  };
};
