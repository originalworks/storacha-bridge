import { execSync, spawn } from 'child_process';

const HARDHAT_NODE_ADDRESS = '127.0.0.1:8545';
export const HARDHART_NODE_RPC_URL = `http://${HARDHAT_NODE_ADDRESS}`;

export interface HardhatNode {
  stopHardhatNode: () => void;
  rpcUrl: string;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const isRpcUp = async (url: string): Promise<boolean> => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1,
      }),
    });

    if (!res.ok) return false;

    const json = await res.json();
    return json.result !== undefined;
  } catch {
    return false;
  }
};

const stopHardhatNode = async () => {
  try {
    const pid = parseInt(
      execSync(`lsof -ti @${HARDHAT_NODE_ADDRESS}`).toString().trim(),
      10,
    );
    process.kill(pid);
  } catch {}
};

export const startHardhatNode = async (): Promise<HardhatNode> => {
  await stopHardhatNode();

  spawn('npx', ['hardhat', 'node'], {
    stdio: 'ignore',
  });

  let attempts = 0;

  while (attempts < 20) {
    if (await isRpcUp(HARDHART_NODE_RPC_URL)) {
      return {
        stopHardhatNode,
        rpcUrl: HARDHART_NODE_RPC_URL,
      };
    }

    attempts++;
    await sleep(500);
  }

  throw new Error('Cannot esablish connection with HardhatNode');
};
