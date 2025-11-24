# Zencoder Repo Instructions — space-modeller

## Tech stack (pin these assumptions)
- Angular 18 with standalone components, OnPush change detection, and **ZONELESS MODE** (Zone.js disabled).
- TypeScript 5.5 (no any unless unavoidable).
- RxJS 7.8; prefer pipeable operators and takeUntilDestroyed.
- Three.js 0.180; use three/examples/jsm/* modules when needed.
- web-ifc 0.0.73 for direct IFC file loading (WASM-based).
- Testing: Jasmine + Karma (CLI defaults).
- Formatting: Prettier (width 100, single quotes, Angular HTML parser).

### Zoneless Architecture
- **Zone.js is completely disabled** in this application (`angular.json` has empty polyfills array).
- Uses `provideExperimentalZonelessChangeDetection()` in `app.config.ts`.
- Required to avoid Zone.js Promise patching conflicts with web-ifc WASM initialization.
- All change detection is manual using Signals and OnPush strategy - no `NgZone` needed.
- All async operations that affect UI MUST update signals to trigger change detection.

## Project conventions

### Components
- Standalone: `standalone: true`, `changeDetection: ChangeDetectionStrategy.OnPush`.
- Inputs/Outputs are typed; avoid any.
- Prefer Signals for local reactive state; otherwise BehaviorSubject for shared state.
- Use @viewChild with `{ static: true/false }` explicitly typed.

### Services
- Injectable `providedIn: 'root'` unless there's a clear feature scope.
- No direct subscribe in services unless returning a teardown; expose cold Observables or methods.

### RxJS
- Avoid manual unsubscribe; use `takeUntilDestroyed(inject(DestroyRef))`.
- Never nest subscriptions; compose with switchMap, mergeMap, etc.

### Routing
- Feature routes in dedicated files; lazy-load via loadComponent / loadChildren.

### State & data
- DTOs and public API shapes live in `src/app/shared/models/*`.
- Keep Api* wrappers separate from UI components. Components are dumb; services handle IO.

### Styling
- Use Angular styles or Tailwind (if present); no global CSS resets beyond Angular defaults.

### Naming
- kebab-case files, PascalCase types/classes, camelCase vars/functions.
- Suffixes: `*.component.ts`, `*.service.ts`, `*.model.ts`, `*.utils.ts`.

## Three.js in Angular — rules of engagement

### Canvas ownership
- One component owns the WebGL `<canvas>`; expose a `#canvas` template ref.

### Zone hygiene
- Run render loop outside Angular:
```typescript
const ngZone = inject(NgZone);
ngZone.runOutsideAngular(() => this.animate());
```

### Lifecycle
- Tear down renderer, scenes, geometries, materials in ngOnDestroy; use destroy*() helpers.

### Performance
- Prefer InstancedMesh for repeated geometry; batch draw calls.
- Enable `renderer.physicallyCorrectLights = false` (legacy compat).

### Controls
- If using OrbitControls, attach in ngAfterViewInit, dispose in ngOnDestroy.

### ThatOpen integration
- Initialize Components once per scene; store in a service if shared across routes.
- Use FragmentsManager for IFC/geometry streaming.
- Keep UI separate: @thatopen/ui web components live in Angular templates but don't share state directly—emit events or use a facade service.

## IFC / WASM Configuration

### Default Setup (CDN)
- Currently configured to use CDN for web-ifc WASM files (quick development)
- Path: `https://unpkg.com/web-ifc@0.0.66/`
- No additional setup required

### Local WASM Setup (Production)
For production, use local WASM files:

1. Copy WASM files to public directory:
```bash
mkdir -p public/assets/wasm
cp node_modules/web-ifc/*.wasm public/assets/wasm/
```

2. Update configuration in `viewer-config.model.ts`:
```typescript
export const DEFAULT_VIEWER_CONFIG: ViewerConfig = {
  wasm: {
    path: '/assets/wasm/',
    useCdn: false,
  },
  // ...
};
```

3. Configure Angular to copy WASM files during build in `angular.json`:
```json
"assets": [
  {
    "glob": "**/*",
    "input": "public"
  },
  {
    "glob": "**/*.wasm",
    "input": "node_modules/web-ifc",
    "output": "/assets/wasm"
  }
]
```

## Code smells to avoid
- `any` types, especially in `.component.ts`.
- Imperative DOM reads (`nativeElement.offsetWidth`) in logic; use ResizeObserver or Angular built-ins.
- Manual `subscribe()` without `takeUntilDestroyed`.
- Inline styles or `!important` in CSS.
- Hardcoded URLs; use `environment.*` or constants.
- Mixing business logic in components; keep them presentational.

## Example skeleton

```typescript
import { ChangeDetectionStrategy, Component, ElementRef, viewChild, inject, NgZone, afterNextRender } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as THREE from 'three';

@Component({
  selector: 'app-scene',
  standalone: true,
  template: '<canvas #canvas></canvas>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SceneComponent {
  private readonly ngZone = inject(NgZone);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;

  constructor() {
    afterNextRender(() => {
      this.initThree();
      this.animate();
    });
  }

  private initThree(): void {
    const canvas = this.canvasRef().nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 2, 0.1, 100);
    // ...
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  ngOnDestroy(): void {
    this.renderer?.dispose();
    // dispose geometries, materials, etc.
  }
}
```

## IFC Loading & WASM Configuration

### web-ifc Integration
- Uses `web-ifc@0.0.73` for direct IFC file parsing (WASM-based)
- WASM files loaded from CDN by default: `https://unpkg.com/web-ifc@0.0.73/`
- For production: copy WASM files to `src/assets/wasm/` and update `viewer-config.model.ts`
- WASM initialization happens ONCE at viewer startup in `FragmentsService.initialize()`
- **Never call `ifcApi.Init()` more than once** - causes callback corruption

### Zoneless Requirement
- **web-ifc requires zoneless mode** due to Zone.js Promise patching conflicts
- Zone.js intercepts Promise callbacks which breaks web-ifc's internal WASM initialization
- Running with Zone.js causes `callbacks.shift(...) is not a function` errors
- Solution: Use Angular 18's experimental zoneless mode with `provideExperimentalZonelessChangeDetection()`
```

When in doubt: ask for clarification rather than guess conventions. Keep PRs small and focused.
