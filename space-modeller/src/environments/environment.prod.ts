import { Environment } from './environment';

export const environment: Environment = {
  production: true,
  wasm: {
    path: '/wasm/',
    useCdn: false,
  },
  logging: {
    enabled: true,
    level: 'error',
    sendToServer: true,
  },
  features: {
    showStats: false,
    showGrid: false,
    enableShadows: true,
    enableCulling: true,
  },
  performance: {
    maxMemoryMB: 1024,
    enableMetrics: false,
  },
};
