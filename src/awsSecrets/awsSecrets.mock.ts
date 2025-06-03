export class AwsSecretsManagerMock {
  send() {
    return {
      SecretString: JSON.stringify({
        STORACHA_KEY: 'ABC',
        RPC_URL: 'ELOSZKI',
      }),
    };
  }
}

export class AwsSecretsManagerLocal {
  send() {
    return {
      SecretString: JSON.stringify({
        STORACHA_KEY: process.env.LOCAL_STORACHA_KEY,
        RPC_URL: `http://${process.env.GANACHE_PRIMARY_HOST}:${process.env.GANACHE_PORT}`,
      }),
    };
  }
}
