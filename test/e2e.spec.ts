jest.setTimeout(100000);

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { join } from 'path';
import { ethers, HDNodeWallet } from 'ethers';
import { ConfigModule } from '@nestjs/config';
import { rm } from 'fs/promises';
import { ClientType } from '../src/auth/auth.interface';
import { testFixture } from './fixture';
import { IConfig } from '../src/config/config';
import { StorachaService } from '../src/storacha/storacha.service';
import { Secrets } from '../src/awsSecrets/awsSecrets.module';
import { ISecrets } from '../src/awsSecrets/awsSecrets.interface';
import { TypeOrmModule } from '@nestjs/typeorm';
import { testDbConfig } from '../src/config/dbConfig';
import { UploadModule } from '../src/upload/upload.module';
import { DataSource, Repository } from 'typeorm';
import { Factory, getFactory, randomCID, randomDID } from './factory';
import { Space } from '../src/storacha/storacha.entity';
import { clearDatabase } from './typeorm.utils';

describe('AppController', () => {
  let factory: Factory;
  let app: INestApplication;
  let dataSource: DataSource;
  let fixture: Awaited<ReturnType<typeof testFixture>>;
  let spacesRepo: Repository<Space>;

  const auth: { owen?: string; validator1?: string; validator2?: string } = {};

  const storachaMock = {
    uploadDirectory: jest.fn().mockResolvedValue({ toString: randomCID }),
    uploadFile: jest.fn().mockResolvedValue({ toString: randomCID }),
    addSpace: jest.fn().mockResolvedValue({ did: randomDID }),
    setCurrentSpace: jest.fn(),
  };

  const proofParserMock = jest.fn().mockResolvedValue({ parse: jest.fn() });

  const TEMP_PATH = join(__dirname, 'temp');

  const getAuth = async (client: ClientType, wallet: HDNodeWallet) => {
    const signature = await wallet.signMessage(client);
    const auth = [client, signature].join('::');

    return auth;
  };

  beforeAll(async () => {
    fixture = await testFixture();

    auth.owen = await getAuth('OWEN', fixture.wallets.owen);
    auth.validator1 = await getAuth('VALIDATOR', fixture.wallets.validator1);
    auth.validator2 = await getAuth('VALIDATOR', fixture.wallets.validator2);

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({ ...testDbConfig() }),
        ConfigModule.forRoot({
          load: [
            async (): Promise<Partial<IConfig>> => ({
              TEMP_PATH,
              SECRETS_PATH: 'secrets-path',
              ENVIRONMENT: 'test',
              DDEX_SEQUENCER_ADDRESS: await fixture.sequencer.getAddress(),
            }),
          ],
          isGlobal: true,
        }),
        UploadModule,
      ],
    })
      .overrideProvider(Secrets)
      .useValue({
        RPC_URL: fixture.rpcUrl,
        STORACHA_KEY: 'ABC',
      } as ISecrets)
      .compile();

    const storachaService = module.get(StorachaService);
    (storachaService as any)._client = storachaMock;
    (storachaService as any).loadProofParser = proofParserMock;

    dataSource = module.get(DataSource);
    factory = getFactory(dataSource);
    spacesRepo = dataSource.getRepository(Space);
    app = module.createNestApplication();

    await app.init();

    await factory.createMany<Space>(Space.name, [
      {
        clientType: 'OWEN',
        walletAddress: ethers.ZeroAddress,
      },
      {
        clientType: 'VALIDATOR',
        walletAddress: fixture.wallets.validator1.address,
      },
    ]);
  });

  afterAll(async () => {
    await rm(TEMP_PATH, { recursive: true, force: true });
    jest.clearAllMocks();
    await clearDatabase(dataSource);
    await app.close();
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
            await getAuth('OWEN', fixture.wallets.validator1),
          )
          .expect(401);

        expect(res.text).toEqual(
          `{"message":"Address ${fixture.wallets.validator1.address} is not whitelisted on OWEN whitelist","error":"Unauthorized","statusCode":401}`,
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
            .set('authorization', auth.validator1)
            .expect(400);

          expect(res.text).toEqual(
            `{"message":"File is required","error":"Bad Request","statusCode":400}`,
          );
        });

        it('Rejects non zip files', async () => {
          const file = join(__dirname, './test.jpeg');

          const res = await request(app.getHttpServer())
            .post('/w3up/dir')
            .set('authorization', auth.validator1)
            .attach('file', file)
            .expect(400);

          expect(res.text).toEqual(
            `{"message":"Validation failed (expected type is application/zip)","error":"Bad Request","statusCode":400}`,
          );
        });

        it('Rejects when called by non-validator', async () => {
          const file = join(__dirname, './test.zip');

          const res = await request(app.getHttpServer())
            .post('/w3up/dir')
            .set('authorization', auth.owen)
            .attach('file', file)
            .expect(401);

          expect(res.text).toEqual(
            `{"message":"Only Validators can use this endpoint","error":"Unauthorized","statusCode":401}`,
          );
        });

        it('Processes zip', async () => {
          const file = join(__dirname, './test.zip');

          const res = await request(app.getHttpServer())
            .post('/w3up/dir')
            .set('authorization', auth.validator1)
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
            .set('authorization', auth.owen)
            .expect(400);

          expect(res.text).toEqual(
            `{"message":"File is required","error":"Bad Request","statusCode":400}`,
          );
        });

        it('Rejects non image files', async () => {
          const file = join(__dirname, './test.zip');

          const res = await request(app.getHttpServer())
            .post('/w3up/file')
            .set('authorization', auth.owen)
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
            .set('authorization', auth.owen)
            .attach('file', file)
            .expect(201);

          expect(res.body.cid).toBeDefined();
          expect(typeof res.body.cid).toBe('string');

          expect(res.body.url).toBeDefined();
          expect(typeof res.body.url).toBe('string');
        });
      });
    });

    describe('Spaces management', () => {
      const file = join(__dirname, './test.jpeg');

      beforeEach(async () => {
        await clearDatabase(dataSource);
      });

      it('Throws when space has not been found', async () => {
        let res = await request(app.getHttpServer())
          .post('/w3up/file')
          .set('authorization', auth.owen)
          .attach('file', file)
          .expect(404);

        expect(res.text).toEqual(
          `{"message":"Storacha space not found for address ${fixture.wallets.owen.address}. If you should have one please contact admin@original.works","error":"Not Found","statusCode":404}`,
        );

        res = await request(app.getHttpServer())
          .post('/w3up/file')
          .set('authorization', auth.validator1)
          .attach('file', file)
          .expect(404);

        expect(res.text).toEqual(
          `{"message":"Storacha space not found for address ${fixture.wallets.validator1.address}. If you should have one please contact admin@original.works","error":"Not Found","statusCode":404}`,
        );
      });

      it('Sets did if proof is present but did is empty', async () => {
        const [owenSpace, validator1Space] = await factory.createMany<Space>(
          Space.name,
          [
            {
              clientType: 'OWEN',
              did: null,
              walletAddress: ethers.ZeroAddress,
            },
            {
              clientType: 'VALIDATOR',
              did: null,
              walletAddress: fixture.wallets.validator1.address,
            },
          ],
        );

        expect(owenSpace.did).toBeNull();

        storachaMock.setCurrentSpace.mockRejectedValueOnce(new Error());

        await request(app.getHttpServer())
          .post('/w3up/file')
          .set('authorization', auth.owen)
          .attach('file', file)
          .expect(201);

        const owenSpaceAfter = await spacesRepo.findOneBy({
          clientType: 'OWEN',
        });

        expect(owenSpaceAfter.did).toMatch(/did:key:.*/g);

        expect(validator1Space.did).toBeNull();

        storachaMock.setCurrentSpace.mockRejectedValueOnce(new Error());

        await request(app.getHttpServer())
          .post('/w3up/file')
          .set('authorization', auth.validator1)
          .attach('file', file)
          .expect(201);

        const validator1SpaceAfter = await spacesRepo.findOneBy({
          walletAddress: fixture.wallets.validator1.address,
        });

        expect(validator1SpaceAfter.did).toMatch(/did:key:.*/g);
      });

      it('Selects correct space', async () => {
        const [validator1Space, validator2Space] =
          await factory.createMany<Space>(Space.name, [
            {
              clientType: 'VALIDATOR',
              walletAddress: fixture.wallets.validator1.address,
            },
            {
              clientType: 'VALIDATOR',
              walletAddress: fixture.wallets.validator2.address,
            },
          ]);

        await request(app.getHttpServer())
          .post('/w3up/file')
          .set('authorization', auth.validator1)
          .attach('file', file)
          .expect(201);

        expect(storachaMock.setCurrentSpace).toHaveBeenCalledWith(
          validator1Space.did,
        );

        await request(app.getHttpServer())
          .post('/w3up/file')
          .set('authorization', auth.validator2)
          .attach('file', file)
          .expect(201);

        expect(storachaMock.setCurrentSpace).toHaveBeenCalledWith(
          validator2Space.did,
        );
      });
    });
  });
});
