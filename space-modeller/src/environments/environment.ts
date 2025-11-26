export interface Environment {
  production: boolean;
  apiUrl?: string;
  wasm: {
    path: string;
    useCdn: boolean;
  };
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    sendToServer: boolean;
  };
  features: {
    showStats: boolean;
    showGrid: boolean;
    enableShadows: boolean;
    enableCulling: boolean;
  };
  performance: {
    maxMemoryMB: number;
    enableMetrics: boolean;
  };
}

export const environment: Environment = {
  production: false,
  wasm: {
    path: 'https://unpkg.com/web-ifc@0.0.73/',
    useCdn: true,
  },
  logging: {
    enabled: true,
    level: 'debug',
    sendToServer: false,
  },
  features: {
    showStats: true,
    showGrid: true,
    enableShadows: false,
    enableCulling: true,
  },
  performance: {
    maxMemoryMB: 512,
    enableMetrics: true,
  },
};
