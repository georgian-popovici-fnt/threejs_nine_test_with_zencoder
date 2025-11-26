import { Injectable } from '@angular/core';
import * as THREE from 'three';
import * as WEBIFC from 'web-ifc';
import { ViewerConfig } from '../shared/models/viewer-config.model';

export interface LoadProgress {
  percent: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class FragmentsService {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private ifcApi: WEBIFC.IfcAPI | null = null;
  private currentModelGroup: THREE.Group | null = null;
  private currentModelData: Uint8Array | null = null;
  private currentFileName: string | null = null;
  private isInitialized = false;
  private isInitializing = false;



  async initialize(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    config: ViewerConfig
  ): Promise<void> {
    if (this.isInitializing) {
      throw new Error('Initialization already in progress');
    }

    if (this.isInitialized) {
      return;
    }

    this.isInitializing = true;
    this.scene = scene;
    this.camera = camera;

    try {
      this.ifcApi = new WEBIFC.IfcAPI();

      const wasmPath = config.wasm.useCdn 
        ? config.wasm.path
        : config.wasm.path;

      this.ifcApi.SetWasmPath(wasmPath);
      await this.ifcApi.Init();
      
      this.isInitialized = true;
      console.log('IFC API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize IFC API:', error);
      this.ifcApi = null;
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async loadIfcFile(
    file: File,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<THREE.Group | null> {
    if (this.isInitializing) {
      console.error('Service is still initializing. Please wait.');
      return null;
    }

    if (!this.ifcApi || !this.scene || !this.isInitialized) {
      console.error('Fragments service not initialized. Please refresh the page.');
      return null;
    }

    try {
      if (onProgress) {
        onProgress({
          percent: 10,
          message: 'Reading file...'
        });
      }

      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      this.currentModelData = data;
      this.currentFileName = file.name;

      if (onProgress) {
        onProgress({
          percent: 30,
          message: 'Opening IFC model...'
        });
      }

      const modelID = this.ifcApi.OpenModel(data);

      if (onProgress) {
        onProgress({
          percent: 50,
          message: 'Generating geometry...'
        });
      }

      const modelGroup = new THREE.Group();
      modelGroup.name = file.name;

      const meshes = this.generateGeometry(modelID);
      meshes.forEach(mesh => modelGroup.add(mesh));

      if (this.currentModelGroup) {
        this.scene.remove(this.currentModelGroup);
        this.disposeGroup(this.currentModelGroup);
      }

      this.currentModelGroup = modelGroup;
      this.scene.add(modelGroup);

      const box = new THREE.Box3().setFromObject(modelGroup);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = this.camera?.fov || 75;
      const cameraZ = Math.abs(maxDim / Math.sin(fov * Math.PI / 360) / 2);

      if (this.camera) {
        this.camera.position.set(
          center.x + cameraZ * 0.5,
          center.y + cameraZ * 0.5,
          center.z + cameraZ
        );
      }

      this.ifcApi.CloseModel(modelID);

      if (onProgress) {
        onProgress({
          percent: 100,
          message: 'Loading complete'
        });
      }

      console.log(`Loaded IFC model: ${file.name}`);
      return modelGroup;
    } catch (error) {
      console.error('Error loading IFC file:', error);
      if (onProgress) {
        onProgress({
          percent: 0,
          message: `Error: ${error}`
        });
      }
      return null;
    }
  }

  private generateGeometry(modelID: number): THREE.Mesh[] {
    if (!this.ifcApi) {
      return [];
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
          console.warn(`Error processing geometry ${j} of mesh ${i}:`, error);
          continue;
        }
      }
    }

    console.log(`Generated ${meshes.length} meshes from IFC model`);
    return meshes;
  }

  async exportFragments(): Promise<Uint8Array | null> {
    if (!this.currentModelData) {
      console.error('No model loaded to export');
      return null;
    }

    try {
      return this.currentModelData;
    } catch (error) {
      console.error('Error exporting fragments:', error);
      return null;
    }
  }

  getCurrentModel(): THREE.Group | null {
    return this.currentModelGroup;
  }

  updateCulling(): void {
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material?.dispose();
        }
      }
    });
  }

  dispose(): void {
    if (this.currentModelGroup && this.scene) {
      this.scene.remove(this.currentModelGroup);
      this.disposeGroup(this.currentModelGroup);
      this.currentModelGroup = null;
    }

    this.ifcApi = null;
    this.scene = null;
    this.camera = null;
    this.currentModelData = null;
    this.currentFileName = null;
    this.isInitialized = false;
    this.isInitializing = false;
  }
}
