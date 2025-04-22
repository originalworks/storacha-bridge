import {
  BaseContract,
  ethers,
  Signer,
  TransactionReceipt,
  TransactionResponse,
  Wallet,
  ZeroAddress,
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

  console.log(`Signer ${address} - Nonce before: ${nonceBefore}`);

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

const createWallets = async (config: GanacheConfig) => {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallets: ethers.HDNodeWallet[] = [];
  const wallet = Wallet.fromPhrase(config.mnemonic, provider);
  for (let i = 0; i < 4; i++) {
    const hdWallet = wallet.deriveChild(i);
    await confirmTx(
      wallet.sendTransaction({
        to: hdWallet.address,
        value: ethers.parseEther('1'),
      }),
      wallet,
    );

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
      ZeroAddress,
    )
  ).data;

  const sequencerProxy = await confirmTx(
    new ERC1967Proxy__factory(deployer).deploy(
      await sequencerImplementation.getAddress(),
      sequencerInitializeArgs,
    ),
    deployer,
  );

  let nonce = await deployer.getNonce('pending');

  await confirmTx(
    dataProvidersWhitelist.addToWhitelist(owen.address, { nonce }),
    deployer,
  );

  nonce = await deployer.getNonce('pending');

  await confirmTx(
    validatorsWhitelist.addToWhitelist(validator.address, { nonce }),
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
