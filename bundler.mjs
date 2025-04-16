import * as esbuild from 'esbuild';
import esbuildPluginTsc from 'esbuild-plugin-tsc';
// import { sentryEsbuildPlugin } from '@sentry/esbuild-plugin';

// function uploadSourceMapToSentry() {
//   if (!process.env.SENTRY_AUTH_TOKEN) {
//     console.log(
//       'SENTRY_AUTH_TOKEN env var is not set! Skipping upload configuration',
//     );
//     return [];
//   }
//   return [
//     sentryEsbuildPlugin({
//       org: 'rumble-fish',
//       project: 'devawallet-backend',
//       authToken: process.env.SENTRY_AUTH_TOKEN,
//     }),
//   ];
// }

await esbuild.build({
  entryPoints: ['src/lambdaEntrypoint.ts'],
  bundle: true,
  sourcemap: true,
  minify: false,
  platform: 'node',
  target: 'node22',
  outdir: 'infrastructure/out/storacha-bridge',
  plugins: [
    esbuildPluginTsc(),
    // ...uploadSourceMapToSentry()
  ],
  external: [
    '@aws-sdk/*',
    '@nestjs/microservices',
    '@nestjs/websockets',
    'class-transformer/storage',
  ],
});
