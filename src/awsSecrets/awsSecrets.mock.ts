export class AwsSecretsManagerMock {
  send() {
    return {
      SecretString: JSON.stringify({
        STORACHA_KEY: 'ABC',
        STORACHA_PROOF: 'ABC',
        RPC_URL: 'ELOSZKI',
      }),
    };
  }
}
