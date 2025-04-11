jest.setTimeout(50000);

import { Test, TestingModule } from '@nestjs/testing';
import { UploadModule } from './upload.module';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { join } from 'path';
import { Wallet } from 'ethers';
import { ConfigModule } from '@nestjs/config';
import { rm } from 'fs/promises';

describe('AppController', () => {
  let app: INestApplication;
  const TEMP_PATH = join(__dirname, '../../test/temp');
  const wallet = Wallet.createRandom();

  const getAuth = async () => {
    const chainId = '1';
    const signature = await wallet.signMessage('1');
    const auth = [signature, chainId].join('::');

    return auth;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [
            async () => ({
              TEMP_PATH,
              NODE_ENV: 'test',
              STORACHA_KEY:
                'MgCaK21ekJPCQJrbemtN33v1v/FSlMmAPqUFTpSV+Am5GCe0B/PwPOXtaYaSIkItKAXSzi8DfRH0E5w2o7IDotaW45To=',
              STORACHA_PROOF:
                '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iOndlYjMuc3RvcmFnZWNhdWRYIu0B2iiug1OMEQuprSRZQQ8Ag/PKSP6Iixxlm45s6AtENIhjZXhw9mNmY3SBom5hY2Nlc3MvY29uZmlybdgqWCUAAXESIHLPBi7XkLSYWxys7nwRkAEFbNra6MOUNVM9kmd1tcopbmFjY2Vzcy9yZXF1ZXN02CpYJQABcRIgtr7vj1onn78ZbUymOVFt8GYOp7R+l3x43fMeqtw5kiJjaXNzUp0ad2ViOndlYjMuc3RvcmFnZWNwcmaA3wsBcRIgkL6Sih7rnzsm9TzTu5NjwWsplGp6wZnMp7/yiamDzxOoYXNYRO2hA0DznZNGDS5lLKVEAQneaPohaQAB2L04XmoGvjo/7wyYRkXeqicDjW3+IJ1K3fIGv4gckMMHEQaN1f7p+syH3RwJYXZlMC45LjFjYXR0iKJjY2FuZ3NwYWNlLypkd2l0aHg4ZGlkOmtleTp6Nk1rbkhFbnZkVU5jRjZCcG1IYXNTblczUHBMZHljNkE5QUM1dURaWEhha1J4cXqiY2NhbmZibG9iLypkd2l0aHg4ZGlkOmtleTp6Nk1rbkhFbnZkVU5jRjZCcG1IYXNTblczUHBMZHljNkE5QUM1dURaWEhha1J4cXqiY2NhbmdpbmRleC8qZHdpdGh4OGRpZDprZXk6ejZNa25IRW52ZFVOY0Y2QnBtSGFzU25XM1BwTGR5YzZBOUFDNXVEWlhIYWtSeHF6omNjYW5nc3RvcmUvKmR3aXRoeDhkaWQ6a2V5Ono2TWtuSEVudmRVTmNGNkJwbUhhc1NuVzNQcExkeWM2QTlBQzV1RFpYSGFrUnhxeqJjY2FuaHVwbG9hZC8qZHdpdGh4OGRpZDprZXk6ejZNa25IRW52ZFVOY0Y2QnBtSGFzU25XM1BwTGR5YzZBOUFDNXVEWlhIYWtSeHF6omNjYW5oYWNjZXNzLypkd2l0aHg4ZGlkOmtleTp6Nk1rbkhFbnZkVU5jRjZCcG1IYXNTblczUHBMZHljNkE5QUM1dURaWEhha1J4cXqiY2NhbmpmaWxlY29pbi8qZHdpdGh4OGRpZDprZXk6ejZNa25IRW52ZFVOY0Y2QnBtSGFzU25XM1BwTGR5YzZBOUFDNXVEWlhIYWtSeHF6omNjYW5ndXNhZ2UvKmR3aXRoeDhkaWQ6a2V5Ono2TWtuSEVudmRVTmNGNkJwbUhhc1NuVzNQcExkeWM2QTlBQzV1RFpYSGFrUnhxemNhdWRYIu0B/PwPOXtaYaSIkItKAXSzi8DfRH0E5w2o7IDotaW45TpjZXhw9mNmY3SBoWVzcGFjZaFkbmFtZWR0ZXN0Y2lzc1gi7QHaKK6DU4wRC6mtJFlBDwCD88pI/oiLHGWbjmzoC0Q0iGNwcmaQ2CpYJQABcRIgUAuKVSFZchXEjkTho7MC8d3S4IVwf95vz5yWb8pKqsXYKlglAAFxEiBQC4pVIVlyFcSOROGjswLx3dLghXB/3m/PnJZvykqqxdgqWCUAAXESIFALilUhWXIVxI5E4aOzAvHd0uCFcH/eb8+clm/KSqrF2CpYJQABcRIgUAuKVSFZchXEjkTho7MC8d3S4IVwf95vz5yWb8pKqsXYKlglAAFxEiBQC4pVIVlyFcSOROGjswLx3dLghXB/3m/PnJZvykqqxdgqWCUAAXESIFALilUhWXIVxI5E4aOzAvHd0uCFcH/eb8+clm/KSqrF2CpYJQABcRIgUAuKVSFZchXEjkTho7MC8d3S4IVwf95vz5yWb8pKqsXYKlglAAFxEiBQC4pVIVlyFcSOROGjswLx3dLghXB/3m/PnJZvykqqxdgqWCUAAXESID1WFD6fWvm/yGHlJN5xj4yUXsyoWnfJjurXGarFiy552CpYJQABcRIgPVYUPp9a+b/IYeUk3nGPjJRezKhad8mO6tcZqsWLLnnYKlglAAFxEiA9VhQ+n1r5v8hh5STecY+MlF7MqFp3yY7q1xmqxYsuedgqWCUAAXESID1WFD6fWvm/yGHlJN5xj4yUXsyoWnfJjurXGarFiy552CpYJQABcRIgPVYUPp9a+b/IYeUk3nGPjJRezKhad8mO6tcZqsWLLnnYKlglAAFxEiA9VhQ+n1r5v8hh5STecY+MlF7MqFp3yY7q1xmqxYsuedgqWCUAAXESID1WFD6fWvm/yGHlJN5xj4yUXsyoWnfJjurXGarFiy552CpYJQABcRIgPVYUPp9a+b/IYeUk3nGPjJRezKhad8mO6tcZqsWLLnk',
            }),
          ],
          isGlobal: true,
        }),
        UploadModule,
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
            .set('authorization', await getAuth())
            .expect(400);

          expect(res.text).toEqual(
            `{"message":"File is required","error":"Bad Request","statusCode":400}`,
          );
        });

        it('Rejects non zip files', async () => {
          const file = join(__dirname, '../../test/test.jpeg');

          const res = await request(app.getHttpServer())
            .post('/w3up/dir')
            .set('authorization', await getAuth())
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
            .set('authorization', await getAuth())
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
            .set('authorization', await getAuth())
            .expect(400);

          expect(res.text).toEqual(
            `{"message":"File is required","error":"Bad Request","statusCode":400}`,
          );
        });

        it('Rejects non image files', async () => {
          const file = join(__dirname, '../../test/test.zip');

          const res = await request(app.getHttpServer())
            .post('/w3up/file')
            .set('authorization', await getAuth())
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
            .set('authorization', await getAuth())
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
