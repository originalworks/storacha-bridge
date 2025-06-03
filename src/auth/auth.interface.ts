import { Request } from 'express';

export interface AuthInfo {
  walletAddress: string;
  clientType: ClientType;
}

export interface ReqWithWallet extends Request, AuthInfo {}

export type ClientType = 'OWEN' | 'VALIDATOR';
