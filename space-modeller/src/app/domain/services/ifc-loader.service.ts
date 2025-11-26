import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';
import * as WEBIFC from 'web-ifc';
import { LoggerService } from '../../core/logging/logger.service';
import { IfcLoadError, WasmLoadError } from '../../core/errors/app-error';
import { IfcModel, IfcModelData, IfcModelMetadata, IfcLoadProgress } from '../models/ifc-model.model';
import { ViewerConfig } from '../interfaces/viewer-config.interface';

export type ProgressCallback = (progress: IfcLoadProgress) => void;

@Injectable({
  providedIn: 'root',
})
export class IfcLoaderService {
  private readonly logger = inject(LoggerService);
  private ifcApi: WEBIFC.IfcAPI | null = null;
  private isInitialized = false;
  private isInitializing = false;

  async initialize(config: ViewerConfig): Promise<void> {
    if (this.isInitializing) {
      throw new Error('IFC Loader initialization already in progress');
    }

    if (this.isInitialized) {
      this.logger.debug('IFC Loader already initialized', 'IfcLoaderService');
      return;
    }

    this.isInitializing = true;
    this.logger.info('Initializing IFC Loader', 'IfcLoaderService', { wasmPath: config.wasm.path });

    try {
      this.ifcApi = new WEBIFC.IfcAPI();
      this.ifcApi.SetWasmPath(config.wasm.path);
      
      await this.ifcApi.Init();
      
      this.isInitialized = true;
      this.logger.info('IFC Loader initialized successfully', 'IfcLoaderService');
    } catch (error) {
      this.logger.error('Failed to initialize IFC Loader', error as Error, 'IfcLoaderService');
      this.ifcApi = null;
      throw new WasmLoadError(
        'Failed to initialize web-ifc WASM module',
        error as Error,
        { wasmPath: config.wasm.path }
      );
    } finally {
      this.isInitializing = false;
    }
  }

  async loadIfcFile(
    file: File,
    onProgress?: ProgressCallback
  ): Promise<IfcModel> {
    this.ensureInitialized();

    this.logger.info('Loading IFC file', 'IfcLoaderService', { 
      fileName: file.name,
      fileSize: file.size 
    });

    try {
      onProgress?.({
        percent: 10,
        message: 'Reading file...',
        stage: 'reading',
      });

      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);

      onProgress?.({
        percent: 30,
        message: 'Opening IFC model...',
        stage: 'parsing',
      });

      const modelID = this.ifcApi!.OpenModel(data);

      onProgress?.({
        percent: 50,
        message: 'Generating geometry...',
        stage: 'geometry',
      });

      const modelGroup = new THREE.Group();
      modelGroup.name = file.name;

      const meshes = this.generateGeometry(modelID);
      meshes.forEach(mesh => modelGroup.add(mesh));

      onProgress?.({
        percent: 90,
        message: 'Finalizing...',
        stage: 'rendering',
      });

      const boundingBox = new THREE.Box3().setFromObject(modelGroup);

      const metadata: IfcModelMetadata = {
        id: this.generateModelId(),
        fileName: file.name,
        fileSize: file.size,
        loadedAt: new Date(),
        meshCount: meshes.length,
        vertexCount: this.countVertices(meshes),
        boundingBox,
      };

      this.ifcApi!.CloseModel(modelID);

      onProgress?.({
        percent: 100,
        message: 'Complete',
        stage: 'complete',
      });

      this.logger.info('IFC file loaded successfully', 'IfcLoaderService', {
        fileName: file.name,
        meshCount: meshes.length,
      });

      const modelData: IfcModelData = {
        modelGroup,
        metadata,
        rawData: data,
      };

      return new IfcModel(modelData);
    } catch (error) {
      this.logger.error('Failed to load IFC file', error as Error, 'IfcLoaderService', {
        fileName: file.name,
      });
      
      throw new IfcLoadError(
        `Failed to load IFC file: ${file.name}`,
        error as Error,
        { fileName: file.name, fileSize: file.size }
      );
    }
  }

  private generateGeometry(modelID: number): THREE.Mesh[] {
    if (!this.ifcApi) {
      throw new Error('IFC API not initialized');
    }

    const meshes: THREE.Mesh[] = [];
    const flatMeshes = this.ifcApi.LoadAllGeometry(modelID);

    for (let i = 0; i < flatMeshes.size(); i++) {
      const flatMesh = flatMeshes.get(i);
      
      for (let j = 0; j < flatMesh.geometries.size(); j++) {
        const placedGeometry = flatMesh.geometries.get(j);
        if (!placedGeometry) continue;
        
        try {
          const geometry = this.ifcApi.GetGeometry(modelID, placedGeometry.geometryExpressID);
          const vertexData = geometry.GetVertexData();
          const vertexDataSize = geometry.GetVertexDataSize();
          const indexData = geometry.GetIndexData();
          const indexDataSize = geometry.GetIndexDataSize();
          
          const verts = this.ifcApi.GetVertexArray(vertexData, vertexDataSize);
          const indices = this.ifcApi.GetIndexArray(indexData, indexDataSize);

          if (!verts || !indices || verts.length === 0 || indices.length === 0) {
            geometry.delete();
            continue;
          }

          const positionAttribute = new THREE.Float32BufferAttribute(verts, 3);
          const indexAttribute = new THREE.Uint32BufferAttribute(indices, 1);

          const bufferGeometry = new THREE.BufferGeometry();
          bufferGeometry.setAttribute('position', positionAttribute);
          bufferGeometry.setIndex(indexAttribute);
          
          bufferGeometry.computeVertexNormals();
          bufferGeometry.computeBoundingBox();
          bufferGeometry.computeBoundingSphere();

          const color = placedGeometry.color;
          const r = Math.max(0, Math.min(1, color.x));
          const g = Math.max(0, Math.min(1, color.y));
          const b = Math.max(0, Math.min(1, color.z));
          const a = Math.max(0, Math.min(1, color.w));
          
          const materialColor = new THREE.Color(r, g, b);
          
          const material = new THREE.MeshLambertMaterial({
            color: materialColor,
            side: THREE.DoubleSide,
            transparent: a < 0.99,
            opacity: a,
            depthWrite: a >= 0.99,
          });

          const mesh = new THREE.Mesh(bufferGeometry, material);
          mesh.userData['ifcExpressID'] = flatMesh.expressID;
          mesh.userData['geometryExpressID'] = placedGeometry.geometryExpressID;
          
          const matrix = new THREE.Matrix4();
          matrix.fromArray(placedGeometry.flatTransformation);
          mesh.applyMatrix4(matrix);

          mesh.frustumCulled = true;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          meshes.push(mesh);
          
          geometry.delete();
        } catch (error) {
          this.logger.warn(
            `Error processing geometry ${j} of mesh ${i}`,
            'IfcLoaderService',
            { error }
          );
          continue;
        }
      }
    }

    this.logger.debug(`Generated ${meshes.length} meshes from IFC model`, 'IfcLoaderService');
    return meshes;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.ifcApi) {
      throw new IfcLoadError('IFC Loader not initialized', undefined, {
        isInitialized: this.isInitialized,
        hasApi: !!this.ifcApi,
      });
    }
  }

  private generateModelId(): string {
    return `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private countVertices(meshes: THREE.Mesh[]): number {
    return meshes.reduce((count, mesh) => {
      const positions = mesh.geometry.attributes['position'];
      return count + (positions ? positions.count : 0);
    }, 0);
  }

  dispose(): void {
    this.ifcApi = null;
    this.isInitialized = false;
    this.isInitializing = false;
    this.logger.info('IFC Loader disposed', 'IfcLoaderService');
  }
}
