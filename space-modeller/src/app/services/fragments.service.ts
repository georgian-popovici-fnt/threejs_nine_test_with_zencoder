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
      
      const placedGeometry = flatMesh.geometries.get(0);
      if (!placedGeometry) continue;
      
      const geometry = this.ifcApi.GetGeometry(modelID, placedGeometry.geometryExpressID);
      const verts = this.ifcApi.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize());
      const indices = this.ifcApi.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize());

      const bufferGeometry = new THREE.BufferGeometry();
      bufferGeometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      bufferGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
      bufferGeometry.computeVertexNormals();

      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(0.7, 0.7, 0.7),
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(bufferGeometry, material);
      
      const matrix = new THREE.Matrix4();
      const matrixArray = placedGeometry.flatTransformation;
      matrix.fromArray(matrixArray);
      mesh.applyMatrix4(matrix);

      meshes.push(mesh);
    }

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
