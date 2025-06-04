import { ethers } from 'ethers';
import type { AuthInfo } from '../auth/auth.interface';

export const TEMP_SPACE: AuthInfo = {
  clientType: 'OWEN',
  walletAddress: ethers.ZeroAddress,
};
