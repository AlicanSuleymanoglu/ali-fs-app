import sharedConfig from '@monorepo/jest-playwright-config/jest-config' with { type: 'json' };

export default {
  ...sharedConfig,
  rootDir: './',
};
