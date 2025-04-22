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
): Promise<TransactionReceipt>;

async function confirmTx<T extends BaseContract>(
  contractOrTx: Promise<T>,
  signer: Signer,
): Promise<T>;

async function confirmTx(
  contractOrTx: Promise<BaseContract | TransactionResponse>,
  signer: Signer,
): Promise<BaseContract | TransactionReceipt> {
  const address = await signer.getAddress();
  const nonceBefore = await signer.getNonce();
  const noncePending = await signer.getNonce('pending');

  console.log(
    `Signer ${address} - Nonce before: ${nonceBefore}, Pending: ${noncePending}`,
  );

  const awaited = await contractOrTx;

  let res: BaseContract | TransactionReceipt;

  if ('wait' in awaited) {
    res = await awaited.wait(1);
  } else {
    res = await awaited.waitForDeployment();
  }

  const nonceAfter = await signer.getNonce();
  console.log(`Signer ${address} - Nonce after: ${nonceAfter}`);

  return res;
}

const lineupNonces = async (signer: Signer, expected = 0) => {
  let noncesMatch = false;

  while (noncesMatch === false) {
    const latest = await signer.getNonce('latest');
    const pending = await signer.getNonce('pending');

    console.log(`Checking nonces. Latest: ${latest}, Pending: ${pending}`);

    if (latest === pending) {
      console.log(`Nonces are in line: ${pending}`);
      if (expected) {
        console.log(`Expected:, ${expected}`);
      }
      noncesMatch = true;
    }
  }
};

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

  await lineupNonces(deployer);

  const sequencerProxy = await confirmTx(
    new ERC1967Proxy__factory(deployer).deploy(
      await sequencerImplementation.getAddress(),
      sequencerInitializeArgs,
    ),
    deployer,
  );

  await lineupNonces(deployer);

  await confirmTx(
    dataProvidersWhitelist.addToWhitelist(owen.address),
    deployer,
  );

  await confirmTx(
    validatorsWhitelist.addToWhitelist(validator.address),
    deployer,
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
