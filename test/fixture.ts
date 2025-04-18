import { ethers, ZeroAddress } from 'ethers';
import { Whitelist__factory } from '../src/contracts/whitelist/Whitelist__factory';
import { DdexSequencer__factory } from '../src/contracts/ddexSequencer/DdexSequencer__factory';
import { ERC1967Proxy__factory } from '../src/contracts/ERC1967Proxy/ERC1967Proxy__factory';
import { startHardhatNode } from './hardhatNode';

const createWallets = async (rpcUrl: string) => {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const accounts = await provider.listAccounts();

  return accounts;
};

export const testFixture = async () => {
  const hardhatNode = await startHardhatNode();
  const [deployer, owen, validator, random] = await createWallets(
    hardhatNode.rpcUrl,
  );

  const dataProvidersWhitelist = await new Whitelist__factory(deployer).deploy(
    deployer.address,
  );

  const validatorsWhitelist = await new Whitelist__factory(deployer).deploy(
    deployer.address,
  );

  const sequencerImplementation = await new DdexSequencer__factory(
    deployer,
  ).deploy();

  const sequencerInitializeArgs = (
    await sequencerImplementation.initialize.populateTransaction(
      await dataProvidersWhitelist.getAddress(),
      await validatorsWhitelist.getAddress(),
      ZeroAddress,
    )
  ).data;

  const sequencerProxy = await new ERC1967Proxy__factory(deployer).deploy(
    await sequencerImplementation.getAddress(),
    sequencerInitializeArgs,
  );

  await (await dataProvidersWhitelist.addToWhitelist(owen.address)).wait();
  await (await validatorsWhitelist.addToWhitelist(validator.address)).wait();

  return {
    sequencer: sequencerProxy,
    validatorsWhitelist,
    dataProvidersWhitelist,
    hardhatNode,
    wallets: {
      deployer,
      owen,
      validator,
      random,
    },
  };
};
