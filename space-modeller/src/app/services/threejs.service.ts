import { Injectable } from '@angular/core';
import * as THREE from 'three';
import CameraControls from 'camera-controls';
import { ViewerConfig } from '../shared/models/viewer-config.model';

CameraControls.install({ THREE });

@Injectable({
  providedIn: 'root'
})
export class ThreejsService {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: CameraControls | null = null;
  private grid: THREE.GridHelper | null = null;
  private animationFrameId: number | null = null;
  private clock = new THREE.Clock();



  initialize(canvas: HTMLCanvasElement, config: ViewerConfig): {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: CameraControls;
  } {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(config.renderer.backgroundColor);

    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(
      config.camera.fov,
      aspect,
      config.camera.near,
      config.camera.far
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.renderer.maxPixelRatio));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    this.controls = new CameraControls(this.camera, canvas);
    this.controls.setLookAt(
      config.camera.position[0],
      config.camera.position[1],
      config.camera.position[2],
      config.camera.target[0],
      config.camera.target[1],
      config.camera.target[2],
      false
    );

    if (config.display.showGrid) {
      this.grid = new THREE.GridHelper(50, 50);
      this.scene.add(this.grid);
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight1.position.set(10, 20, 10);
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-10, 10, -10);
    this.scene.add(directionalLight2);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    this.scene.add(hemisphereLight);

    return {
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      controls: this.controls,
    };
  }

  startRenderLoop(onBeforeRender?: () => void, onAfterRender?: () => void): void {
    if (!this.renderer || !this.scene || !this.camera || !this.controls) {
      return;
    }

    const animate = (): void => {
      this.animationFrameId = requestAnimationFrame(animate);

      if (onBeforeRender) {
        onBeforeRender();
      }

      const delta = this.clock.getDelta();
      if (this.controls) {
        this.controls.update(delta);
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }

      if (onAfterRender) {
        onAfterRender();
      }
    };

    animate();
  }

  onWindowResize(width: number, height: number): void {
    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    if (this.renderer) {
      this.renderer.setSize(width, height);
    }
  }

  getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer;
  }

  getScene(): THREE.Scene | null {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera | null {
    return this.camera;
  }

  getControls(): CameraControls | null {
    return this.controls;
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    if (this.scene) {
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
      this.scene.clear();
      this.scene = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    this.camera = null;
    this.grid = null;
  }
}
