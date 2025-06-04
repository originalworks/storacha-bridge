import awsServerlessExpress from '@vendia/serverless-express';
import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda';
import { AppInstance } from './app.instance';
import { initSentry } from './sentry';

export { runMigrations } from './runMigrations';

let appServer: ReturnType<typeof awsServerlessExpress>;

export const app = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback<any>,
) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!appServer) {
    initSentry();
    const nestApp = await AppInstance.getInstance();
    await nestApp.init();
    const app = nestApp.getHttpAdapter().getInstance();
    appServer = awsServerlessExpress({ app });
  }

  return await appServer(event, context, callback);
};
