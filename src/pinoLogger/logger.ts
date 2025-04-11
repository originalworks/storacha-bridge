import { Logger } from '@nestjs/common';
import { Params } from 'nestjs-pino';

export const pinoConfig: Params = {
  pinoHttp: {
    formatters: {
      level(label, number) {
        return { level: label };
      },
    },
  },
};

export function PinoLoggerDecorator(logger?: Logger) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = function () {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const _this = this;
      const args = [];
      for (let _i = 0; _i < arguments.length; _i++) {
        // eslint-disable-next-line prefer-rest-params
        const arg = arguments[_i];
        if (typeof arg === 'function') {
          continue;
        }
        args[_i] = arg;
      }
      logger.log({
        propertyKey,
        arguments: args.length > 0 ? args : 'NO_ARGUMENTS',
      });
      // eslint-disable-next-line prefer-rest-params
      return originalMethod.apply(_this, arguments);
    };

    return descriptor;
  };
}
