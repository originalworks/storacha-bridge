export interface IConfig {
  ENVIRONMENT: string;
  TEMP_PATH: string;
  DDEX_SEQUENCER_ADDRESS: string;
  SECRETS_PATH: string;
}

export const config = (): IConfig => ({
  ENVIRONMENT: process.env.ENVIRONMENT,
  TEMP_PATH: process.env.TEMP_PATH,
  DDEX_SEQUENCER_ADDRESS: process.env.DDEX_SEQUENCER_ADDRESS,
  SECRETS_PATH: process.env.SECRETS_PATH,
});
