import { AppInstance } from './app.instance';

async function bootstrap() {
  const app = await AppInstance.getInstance();
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
