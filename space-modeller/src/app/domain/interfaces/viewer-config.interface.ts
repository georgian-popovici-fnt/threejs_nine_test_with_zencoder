export interface WasmConfig {
  readonly path: string;
  readonly useCdn: boolean;
}

export interface CameraConfig {
  readonly target: readonly [number, number, number];
  readonly position: readonly [number, number, number];
  readonly fov: number;
  readonly near: number;
  readonly far: number;
}

export interface RendererConfig {
  readonly backgroundColor: string;
  readonly maxPixelRatio: number;
  readonly antialias: boolean;
}

export interface DisplayConfig {
  readonly showGrid: boolean;
  readonly showStats: boolean;
  readonly showAxes: boolean;
}

export interface PerformanceConfig {
  readonly enableFrustumCulling: boolean;
  readonly enableShadows: boolean;
  readonly maxMemoryMB: number;
}

export interface ViewerConfig {
  readonly wasm: WasmConfig;
  readonly camera: CameraConfig;
  readonly renderer: RendererConfig;
  readonly display: DisplayConfig;
  readonly performance: PerformanceConfig;
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
    antialias: true,
  },
  display: {
    showGrid: true,
    showStats: true,
    showAxes: false,
  },
  performance: {
    enableFrustumCulling: true,
    enableShadows: false,
    maxMemoryMB: 512,
  },
};
