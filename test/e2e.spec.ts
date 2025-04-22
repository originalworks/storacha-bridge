jest.setTimeout(100000);

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { join } from 'path';
import { HDNodeWallet } from 'ethers';
import { ConfigModule } from '@nestjs/config';
import { rm } from 'fs/promises';
import { AppModule } from '../src/app.module';
import { ClientType } from '../src/auth/auth.interface';
import { testFixture } from './fixture';
import { IConfig } from '../src/config/config';
import { StorachaService } from '../src/storacha/storacha.service';
import { Secrets } from '../src/awsSecrets/awsSecrets.module';
import { ISecrets } from '../src/awsSecrets/awsSecrets.interface';

describe('AppController', () => {
  let app: INestApplication;
  let fixture: Awaited<ReturnType<typeof testFixture>>;

  const storachaMock = {
    uploadDirectory: jest
      .fn()
      .mockResolvedValue({ toString: () => 'mock-cid-dir' }),
    uploadFile: jest
      .fn()
      .mockResolvedValue({ toString: () => 'mock-cid-file' }),
    addSpace: jest.fn().mockResolvedValue({ did: () => 'did:mock' }),
    setCurrentSpace: jest.fn(),
  };

  const TEMP_PATH = join(__dirname, 'temp');

  const getAuth = async (client: ClientType, wallet: HDNodeWallet) => {
    const signature = await wallet.signMessage(client);
    const auth = [client, signature].join('::');

    return auth;
  };

  beforeAll(async () => {
    fixture = await testFixture();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [
            async (): Promise<IConfig> => ({
              TEMP_PATH,
              SECRETS_PATH: 'secrets-path',
              ENVIRONMENT: 'test',
              DDEX_SEQUENCER_ADDRESS: await fixture.sequencer.getAddress(),
            }),
          ],
          isGlobal: true,
        }),
        AppModule,
      ],
    })
      .overrideProvider(Secrets)
      .useValue({
        RPC_URL: fixture.rpcUrl,
        STORACHA_KEY: 'ABC',
        STORACHA_PROOF: 'ABC',
      } as ISecrets)
      .compile();

    const storachaService = module.get(StorachaService);
    (storachaService as any)._client = storachaMock;

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await rm(TEMP_PATH, { recursive: true, force: true });
    jest.clearAllMocks();
    await app.close();
    // await fixture.hardhatNode.stopHardhatNode();
  });

  describe('Storacha Bridge', () => {
    describe('Auth', () => {
      it('Fails without authorization header', async () => {
        const res = await request(app.getHttpServer())
          .post('/w3up/dir')
          .expect(401);
        expect(res.text).toEqual(
          `{"message":"Missing authorization header","error":"Unauthorized","statusCode":401}`,
        );
      });

      it('Fails on malformed authorization header', async () => {
        let res = await request(app.getHttpServer())
          .post('/w3up/dir')
          .set('authorization', 'HYDRAULIK::TOMASZ')
          .expect(401);

        expect(res.text).toEqual(
          `{"message":"Invalid client type in signed message","error":"Unauthorized","statusCode":401}`,
        );

        res = await request(app.getHttpServer())
          .post('/w3up/dir')
          .set('authorization', 'OWEN::TOMASZ')
          .expect(401);

        expect(res.text).toEqual(
          `{"message":"Malformed signature in authorization header","error":"Unauthorized","statusCode":401}`,
        );
      });

      it('Fails on whitelist', async () => {
        let res = await request(app.getHttpServer())
          .post('/w3up/dir')
          .set(
            'authorization',
            await getAuth('OWEN', fixture.wallets.validator),
          )
          .expect(401);

        expect(res.text).toEqual(
          `{"message":"Address ${fixture.wallets.validator.address} is not whitelisted on OWEN whitelist","error":"Unauthorized","statusCode":401}`,
        );

        res = await request(app.getHttpServer())
          .post('/w3up/dir')
          .set(
            'authorization',
            await getAuth('VALIDATOR', fixture.wallets.owen),
          )
          .expect(401);

        expect(res.text).toEqual(
          `{"message":"Address ${fixture.wallets.owen.address} is not whitelisted on VALIDATOR whitelist","error":"Unauthorized","statusCode":401}`,
        );
      });
    });

    describe('Upload controller', () => {
      describe('/POST w3up/dir', () => {
        it('Rejects when no file attached', async () => {
          const res = await request(app.getHttpServer())
            .post('/w3up/dir')
            .set('authorization', await getAuth('OWEN', fixture.wallets.owen))
            .expect(400);

          expect(res.text).toEqual(
            `{"message":"File is required","error":"Bad Request","statusCode":400}`,
          );
        });

        it('Rejects non zip files', async () => {
          const file = join(__dirname, './test.jpeg');

          const res = await request(app.getHttpServer())
            .post('/w3up/dir')
            .set('authorization', await getAuth('OWEN', fixture.wallets.owen))
            .attach('file', file)
            .expect(400);

          expect(res.text).toEqual(
            `{"message":"Validation failed (expected type is application/zip)","error":"Bad Request","statusCode":400}`,
          );
        });

        it('Processes zip', async () => {
          const file = join(__dirname, './test.zip');

          const res = await request(app.getHttpServer())
            .post('/w3up/dir')
            .set('authorization', await getAuth('OWEN', fixture.wallets.owen))
            .attach('file', file)
            .expect(201);

          expect(res.body.cid).toBeDefined();
          expect(typeof res.body.cid).toBe('string');

          expect(res.body.url).toBeDefined();
          expect(typeof res.body.url).toBe('string');
        });
      });

      describe('/POST w3up/file', () => {
        it('Rejects when no file attached', async () => {
          const res = await request(app.getHttpServer())
            .post('/w3up/file')
            .set('authorization', await getAuth('OWEN', fixture.wallets.owen))
            .expect(400);

          expect(res.text).toEqual(
            `{"message":"File is required","error":"Bad Request","statusCode":400}`,
          );
        });

        it('Rejects non image files', async () => {
          const file = join(__dirname, './test.zip');

          const res = await request(app.getHttpServer())
            .post('/w3up/file')
            .set('authorization', await getAuth('OWEN', fixture.wallets.owen))
            .attach('file', file)
            .expect(400);

          expect(res.text).toEqual(
            `{"message":"Validation failed (expected type is image/*)","error":"Bad Request","statusCode":400}`,
          );
        });

        it('Processes file', async () => {
          const file = join(__dirname, './test.jpeg');

          const res = await request(app.getHttpServer())
            .post('/w3up/file')
            .set('authorization', await getAuth('OWEN', fixture.wallets.owen))
            .attach('file', file)
            .expect(201);

          expect(res.body.cid).toBeDefined();
          expect(typeof res.body.cid).toBe('string');

          expect(res.body.url).toBeDefined();
          expect(typeof res.body.url).toBe('string');
        });
      });
    });
  });
});
