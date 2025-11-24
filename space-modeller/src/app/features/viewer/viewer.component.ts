import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  viewChild,
  inject,
  afterNextRender,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import Stats from 'stats.js';
import { ThreejsService } from '../../services/threejs.service';
import { FragmentsService, LoadProgress } from '../../services/fragments.service';
import { DEFAULT_VIEWER_CONFIG, ViewerConfig } from '../../shared/models/viewer-config.model';

@Component({
  selector: 'app-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './viewer.component.html',
  styleUrl: './viewer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewerComponent {
  private readonly threejsService = inject(ThreejsService);
  private readonly fragmentsService = inject(FragmentsService);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private stats: Stats | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private config: ViewerConfig = DEFAULT_VIEWER_CONFIG;

  protected readonly loadingProgress = signal<LoadProgress | null>(null);
  protected readonly currentFileName = signal<string | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isViewerReady = signal(false);

  constructor() {
    afterNextRender(() => {
      this.initViewer();
    });
  }

  private async initViewer(): Promise<void> {
    try {
      const canvas = this.canvasRef().nativeElement;

      const { renderer, scene, camera, controls } = this.threejsService.initialize(
        canvas,
        this.config
      );

      await this.fragmentsService.initialize(scene, camera, renderer, this.config);

      if (this.config.display.showStats) {
        this.initStats();
      }

      controls.addEventListener('rest', () => {
        this.fragmentsService.updateCulling();
      });

      this.threejsService.startRenderLoop(
        () => this.stats?.begin(),
        () => this.stats?.end()
      );

      this.setupResizeObserver(canvas);
      this.isViewerReady.set(true);
    } catch (error) {
      console.error('Failed to initialize viewer:', error);
      this.isViewerReady.set(false);
    }
  }

  private initStats(): void {
    this.stats = new Stats();
    this.stats.showPanel(2);
    this.stats.dom.style.position = 'absolute';
    this.stats.dom.style.left = '0px';
    this.stats.dom.style.top = '0px';
    document.body.appendChild(this.stats.dom);
  }

  private setupResizeObserver(canvas: HTMLCanvasElement): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.threejsService.onWindowResize(width, height);
      }
    });
    this.resizeObserver.observe(canvas);
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!this.isViewerReady()) {
      console.error('Viewer is not ready yet. Please wait for initialization to complete.');
      input.value = '';
      return;
    }

    if (!file.name.toLowerCase().endsWith('.ifc')) {
      console.error('Please select an IFC file');
      return;
    }

    this.isLoading.set(true);
    this.currentFileName.set(file.name);
    this.loadingProgress.set({ percent: 0, message: 'Starting...' });

    try {
      await this.fragmentsService.loadIfcFile(file, (progress) => {
        this.loadingProgress.set(progress);
      });

      this.loadingProgress.set(null);
    } catch (error) {
      console.error('Error loading file:', error);
      this.loadingProgress.set({ percent: 0, message: `Error: ${error}` });
    } finally {
      this.isLoading.set(false);
      input.value = '';
    }
  }

  protected async onExportFragments(): Promise<void> {
    const model = this.fragmentsService.getCurrentModel();
    if (!model) {
      console.warn('No model loaded to export');
      return;
    }

    const buffer = await this.fragmentsService.exportFragments();
    if (!buffer) {
      console.error('Failed to export fragments');
      return;
    }

    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    const fileName = this.currentFileName() || 'model';
    const fragFileName = fileName.replace(/\.ifc$/i, '.frag');

    const link = document.createElement('a');
    link.href = url;
    link.download = fragFileName;
    link.click();

    URL.revokeObjectURL(url);
  }

  ngOnDestroy(): void {
    if (this.stats?.dom) {
      document.body.removeChild(this.stats.dom);
      this.stats = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.fragmentsService.dispose();
    this.threejsService.dispose();
  }
}
