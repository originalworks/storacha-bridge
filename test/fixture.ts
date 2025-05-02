import {
  BaseContract,
  ethers,
  Signer,
  TransactionReceipt,
  TransactionResponse,
  Wallet,
} from 'ethers';
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

async function confirmTx<T extends TransactionResponse>(
  contractOrTx: Promise<T>,
  signer: Signer,
  expectedNonce?: number,
): Promise<TransactionReceipt>;

async function confirmTx<T extends BaseContract>(
  contractOrTx: Promise<T>,
  signer: Signer,
  expectedNonce?: number,
): Promise<T>;

async function confirmTx(
  contractOrTx: Promise<BaseContract | TransactionResponse>,
  signer: Signer,
  expectedNonce?: number,
): Promise<BaseContract | TransactionReceipt> {
  let noncesMatch = false;
  let retCt = 0;

  while (noncesMatch === false) {
    if (retCt >= 10) {
      throw new Error('Cannot lineup nonces, aborting');
    }
    const latest = await signer.getNonce('latest');
    const pending = await signer.getNonce('pending');

    if (latest === pending) {
      if (!expectedNonce || expectedNonce === pending) {
        noncesMatch = true;
      }
    }
    retCt++;
    sleep(500);
  }

  const awaited = await contractOrTx;

  let res: BaseContract | TransactionReceipt;

  if ('wait' in awaited) {
    res = await awaited.wait();
  } else {
    res = await awaited.waitForDeployment();
  }

  return res;
}

const createWallets = async (config: GanacheConfig) => {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallets: ethers.HDNodeWallet[] = [];
  const wallet = Wallet.fromPhrase(config.mnemonic, provider);

  for (let i = 0; i < 4; i++) {
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

  const nonceCt = await deployer.getNonce('pending');

  const dataProvidersWhitelist = await confirmTx(
    new Whitelist__factory(deployer).deploy(deployer.address),
    deployer,
  );

  const validatorsWhitelist = await confirmTx(
    new Whitelist__factory(deployer).deploy(deployer.address),
    deployer,
  );

  const sequencerImplementation = await confirmTx(
    new DdexSequencer__factory(deployer).deploy(),
    deployer,
  );

  const sequencerInitializeArgs = (
    await sequencerImplementation.initialize.populateTransaction(
      await dataProvidersWhitelist.getAddress(),
      await validatorsWhitelist.getAddress(),
      random.address,
    )
  ).data;

  const sequencerProxy = await confirmTx(
    new ERC1967Proxy__factory(deployer).deploy(
      await sequencerImplementation.getAddress(),
      sequencerInitializeArgs,
    ),
    deployer,
    nonceCt + 3,
  );

  await confirmTx(
    dataProvidersWhitelist.addToWhitelist(owen.address),
    deployer,
    nonceCt + 4,
  );

  await confirmTx(
    validatorsWhitelist.addToWhitelist(validator.address),
    deployer,
    nonceCt + 5,
  );

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
