export interface ViewerConfig {
  wasm: {
    path: string;
    useCdn: boolean;
  };
  camera: {
    target: [number, number, number];
    position: [number, number, number];
    fov: number;
    near: number;
    far: number;
  };
  renderer: {
    backgroundColor: string;
    maxPixelRatio: number;
  };
  display: {
    showGrid: boolean;
    showStats: boolean;
  };
}

export const DEFAULT_VIEWER_CONFIG: ViewerConfig = {
  wasm: {
    path: 'https://unpkg.com/web-ifc@0.0.73/',
    useCdn: true,
  },
  camera: {
    target: [0, 0, 0],
    position: [10, 10, 10],
    fov: 75,
    near: 0.1,
    far: 1000,
  },
  renderer: {
    backgroundColor: '#0e1013',
    maxPixelRatio: 2,
  },
  display: {
    showGrid: true,
    showStats: true,
  },
};

export const CDN_WASM_PATH = 'https://unpkg.com/web-ifc@0.0.73/';
