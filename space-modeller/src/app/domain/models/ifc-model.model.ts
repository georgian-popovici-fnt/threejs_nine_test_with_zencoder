import * as THREE from 'three';

export interface IfcModelMetadata {
  readonly id: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly loadedAt: Date;
  readonly meshCount: number;
  readonly vertexCount: number;
  readonly boundingBox: THREE.Box3;
}

export interface IfcLoadProgress {
  readonly percent: number;
  readonly message: string;
  readonly stage: 'reading' | 'parsing' | 'geometry' | 'rendering' | 'complete';
}

export interface IfcModelData {
  readonly modelGroup: THREE.Group;
  readonly metadata: IfcModelMetadata;
  readonly rawData: Uint8Array;
}

export class IfcModel {
  private _modelGroup: THREE.Group;
  private _metadata: IfcModelMetadata;
  private _rawData: Uint8Array;
  private _disposed = false;

  constructor(data: IfcModelData) {
    this._modelGroup = data.modelGroup;
    this._metadata = data.metadata;
    this._rawData = data.rawData;
  }

  get modelGroup(): THREE.Group {
    this.ensureNotDisposed();
    return this._modelGroup;
  }

  get metadata(): IfcModelMetadata {
    return this._metadata;
  }

  get rawData(): Uint8Array {
    this.ensureNotDisposed();
    return this._rawData;
  }

  get isDisposed(): boolean {
    return this._disposed;
  }

  dispose(): void {
    if (this._disposed) {
      return;
    }

    this._modelGroup.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material?.dispose();
        }
      }
    });

    this._modelGroup.clear();
    this._disposed = true;
  }

  private ensureNotDisposed(): void {
    if (this._disposed) {
      throw new Error('Cannot access disposed IFC model');
    }
  }
}
