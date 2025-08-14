import { ethers, Signer, Wallet } from 'ethers';
import { Whitelist__factory } from '../src/contracts/whitelist/Whitelist__factory';
import { DdexSequencer__factory } from '../src/contracts/ddexSequencer/DdexSequencer__factory';
import { ERC1967Proxy__factory } from '../src/contracts/ERC1967Proxy/ERC1967Proxy__factory';

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface GanacheConfig {
  mnemonic: string;
  rpcUrl: string;
}

const GANACHE_CONFIG: GanacheConfig = {
  mnemonic: process.env.GANACHE_PRIMARY_MNEMONIC,
  rpcUrl: `http://${process.env.GANACHE_PRIMARY_HOST}:${process.env.GANACHE_PORT}`,
};

const createNonceController = async (signer: Signer) => {
  let currentNonce = await signer.getNonce('pending');

  const setNonce = () => {
    const txSettings = {
      nonce: currentNonce,
    };
    currentNonce++;
    return txSettings;
  };

  return setNonce;
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
  const [deployer, owen1, owen2, validator, random] =
    await createWallets(GANACHE_CONFIG);

  const setNonce = await createNonceController(deployer);
  const dataProvidersWhitelist = await (
    await new Whitelist__factory(deployer).deploy(deployer.address, setNonce())
  ).waitForDeployment();

  const validatorsWhitelist = await (
    await new Whitelist__factory(deployer).deploy(deployer.address, setNonce())
  ).waitForDeployment();

  const sequencerImplementation = await (
    await new DdexSequencer__factory(deployer).deploy(setNonce())
  ).waitForDeployment();

  const sequencerInitializeArgs = (
    await sequencerImplementation.initialize.populateTransaction(
      await dataProvidersWhitelist.getAddress(),
      await validatorsWhitelist.getAddress(),
      random.address,
    )
  ).data;

  const sequencerProxy = await (
    await new ERC1967Proxy__factory(deployer).deploy(
      await sequencerImplementation.getAddress(),
      sequencerInitializeArgs,
      setNonce(),
    )
  ).waitForDeployment();

  await (
    await dataProvidersWhitelist.addToWhitelist(owen1.address, setNonce())
  ).wait();

  await (
    await dataProvidersWhitelist.addToWhitelist(owen2.address, setNonce())
  ).wait();

  await (
    await validatorsWhitelist.addToWhitelist(validator.address, setNonce())
  ).wait();

  return {
    sequencer: sequencerProxy,
    validatorsWhitelist,
    dataProvidersWhitelist,
    rpcUrl: GANACHE_CONFIG.rpcUrl,
    wallets: {
      deployer,
      owen1,
      owen2,
      validator,
      random,
    },
  };
};
