jest.setTimeout(50000);

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
import { IStorachaBridgeConfig } from '../src/config/config';

describe('AppController', () => {
  let app: INestApplication;
  let fixture: Awaited<ReturnType<typeof testFixture>>;

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
            async (): Promise<IStorachaBridgeConfig> => ({
              TEMP_PATH,
              NODE_ENV: 'test',
              STORACHA_KEY: process.env.STORACHA_KEY,
              STORACHA_PROOF: process.env.STORACHA_KEY,
              RPC_URL: fixture.rpcUrl,
              DDEX_SEQUENCER_ADDRESS: await fixture.sequencer.getAddress(),
            }),
          ],
          isGlobal: true,
        }),
        AppModule,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await rm(TEMP_PATH, { recursive: true, force: true });
    await app.close();
  });

  describe('Storacha Bridge', () => {
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
          const file = join(__dirname, '../../test/test.jpeg');

          const res = await request(app.getHttpServer())
            .post('/w3up/dir')
            .set('authorization', await getAuth('OWEN', fixture.wallets.owen))
            .attach('file', file)
            .expect(400);

          expect(res.text).toEqual(
            `{"message":"Validation failed (expected type is application/zip)","error":"Bad Request","statusCode":400}`,
          );
        });

        it.only('Processes zip', async () => {
          const file = join(__dirname, '../../test/test.zip');

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
          const file = join(__dirname, '../../test/test.zip');

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
          const file = join(__dirname, '../../test/test.jpeg');

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
