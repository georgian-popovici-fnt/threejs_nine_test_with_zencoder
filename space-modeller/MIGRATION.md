# Migration Guide: Old → Production Architecture

This guide explains how to migrate from the old architecture to the new production-ready structure.

---

## 🎯 Overview of Changes

| Aspect | Old | New |
|--------|-----|-----|
| **Configuration** | Hardcoded in services | Environment-based config files |
| **Error Handling** | `console.error()` | Typed errors with LoggerService |
| **Type Safety** | Basic types | Strong domain models |
| **Services** | Direct Three.js/web-ifc calls | Layered architecture with abstractions |
| **Testing** | Minimal | Full test coverage |
| **Documentation** | CLAUDE.md only | Complete architecture docs |

---

## 📋 Step-by-Step Migration

### **Step 1: Update Imports**

#### **Old:**
```typescript
import { FragmentsService } from './services/fragments.service';
import { DEFAULT_VIEWER_CONFIG } from './shared/models/viewer-config.model';
```

#### **New:**
```typescript
import { IfcLoaderService } from './domain/services/ifc-loader.service';
import { DEFAULT_VIEWER_CONFIG } from './domain/interfaces/viewer-config.interface';
import { LoggerService } from './core/logging/logger.service';
```

---

### **Step 2: Replace Console Logging**

#### **Old:**
```typescript
console.log('Loading IFC file...');
console.error('Failed to load:', error);
```

#### **New:**
```typescript
constructor() {
  private readonly logger = inject(LoggerService);
}

this.logger.info('Loading IFC file', 'ViewerComponent');
this.logger.error('Failed to load', error, 'ViewerComponent', { fileName });
```

---

### **Step 3: Use Typed Errors**

#### **Old:**
```typescript
try {
  // ...
} catch (error) {
  console.error('Error loading file:', error);
  this.loadingProgress.set({ percent: 0, message: `Error: ${error}` });
}
```

#### **New:**
```typescript
import { IfcLoadError } from './core/errors/app-error';
import { AppErrorHandler } from './core/errors/error-handler.service';

try {
  // ...
} catch (error) {
  if (error instanceof IfcLoadError) {
    this.showError(error.userMessage);
  } else {
    this.errorHandler.handleError(error);
  }
}
```

---

### **Step 4: Use Domain Models**

#### **Old:**
```typescript
private currentModelGroup: THREE.Group | null = null;
private currentModelData: Uint8Array | null = null;
```

#### **New:**
```typescript
import { IfcModel } from './domain/models/ifc-model.model';

private currentModel: IfcModel | null = null;

// Access model data
const metadata = this.currentModel.metadata;
const meshCount = metadata.meshCount;
const boundingBox = metadata.boundingBox;
```

---

### **Step 5: Update Service Initialization**

#### **Old:**
```typescript
await this.fragmentsService.initialize(scene, camera, renderer, this.config);
```

#### **New:**
```typescript
// Use environment-based config
await this.ifcLoaderService.initialize(environment);

// Or custom config
const customConfig: ViewerConfig = {
  ...DEFAULT_VIEWER_CONFIG,
  wasm: { path: '/custom/path/', useCdn: false },
};
await this.ifcLoaderService.initialize(customConfig);
```

---

### **Step 6: Handle Progress with Typed Callbacks**

#### **Old:**
```typescript
interface LoadProgress {
  percent: number;
  message: string;
}

await this.fragmentsService.loadIfcFile(file, (progress: LoadProgress) => {
  this.loadingProgress.set(progress);
});
```

#### **New:**
```typescript
import { IfcLoadProgress } from './domain/models/ifc-model.model';

await this.ifcLoaderService.loadIfcFile(file, (progress: IfcLoadProgress) => {
  this.loadingProgress.set(progress);
  // Progress now includes stage information
  if (progress.stage === 'geometry') {
    this.updateGeometryProgress(progress.percent);
  }
});
```

---

### **Step 7: Update App Configuration**

#### **Old: `app.config.ts`**
```typescript
export const appConfig: ApplicationConfig = {
  providers: [provideExperimentalZonelessChangeDetection(), provideRouter(routes)]
};
```

#### **New: `app.config.ts`**
```typescript
import { ErrorHandler } from '@angular/core';
import { AppErrorHandler } from './core/errors/error-handler.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes),
    { provide: ErrorHandler, useClass: AppErrorHandler },
  ]
};
```

---

### **Step 8: Dispose Resources Properly**

#### **Old:**
```typescript
ngOnDestroy(): void {
  this.fragmentsService.dispose();
  this.threejsService.dispose();
}
```

#### **New:**
```typescript
ngOnDestroy(): void {
  if (this.currentModel) {
    this.currentModel.dispose();
    this.currentModel = null;
  }
  
  this.ifcLoaderService.dispose();
  this.threejsService.dispose();
  
  this.logger.info('Viewer component destroyed', 'ViewerComponent');
}
```

---

## 🧪 Testing Migration

### **Old: No Tests**

### **New: With Tests**

```typescript
describe('IfcLoaderService', () => {
  let service: IfcLoaderService;
  let loggerSpy: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    loggerSpy = jasmine.createSpyObj('LoggerService', ['info', 'error', 'debug']);
    
    TestBed.configureTestingModule({
      providers: [
        IfcLoaderService,
        { provide: LoggerService, useValue: loggerSpy },
      ],
    });
    
    service = TestBed.inject(IfcLoaderService);
  });

  it('should throw error when loading before initialization', async () => {
    const file = new File([], 'test.ifc');
    
    await expectAsync(service.loadIfcFile(file))
      .toBeRejectedWithError(IfcLoadError);
  });
});
```

---

## 🔄 File Structure Migration

### **Files to Move:**

```bash
# Old location → New location

# Services
src/app/services/fragments.service.ts
  → src/app/domain/services/ifc-loader.service.ts

src/app/services/threejs.service.ts
  → src/app/infrastructure/threejs/threejs-engine.service.ts

# Models
src/app/shared/models/viewer-config.model.ts
  → src/app/domain/interfaces/viewer-config.interface.ts

# Components (no change needed)
src/app/features/viewer/*
```

---

## 🛠️ Breaking Changes

### **1. FragmentsService → IfcLoaderService**

**Method Changes:**

| Old Method | New Method | Changes |
|------------|------------|---------|
| `loadIfcFile(file)` | `loadIfcFile(file)` | Returns `IfcModel` instead of `THREE.Group` |
| `getCurrentModel()` | Access via stored `IfcModel` instance | Return type changed |
| `exportFragments()` | `ifcModel.rawData` | Use model property directly |

### **2. Error Handling**

- All errors are now typed (`AppError` subclasses)
- No more generic `try/catch` with console.error
- Errors have `.userMessage` for UI display

### **3. Configuration**

- No more `DEFAULT_VIEWER_CONFIG` const export
- Use `environment` import instead
- Config is now readonly and immutable

---

## ⚠️ Common Migration Issues

### **Issue 1: Import Errors**

**Error:**
```
Cannot find module './services/fragments.service'
```

**Solution:**
```typescript
// Update import path
import { IfcLoaderService } from './domain/services/ifc-loader.service';
```

---

### **Issue 2: Type Errors with IfcModel**

**Error:**
```
Property 'add' does not exist on type 'IfcModel'
```

**Solution:**
```typescript
// Old: directly accessing THREE.Group
scene.add(model);

// New: access through modelGroup property
scene.add(model.modelGroup);
```

---

### **Issue 3: Environment Not Found**

**Error:**
```
Cannot find module '@env/environment'
```

**Solution:**
```typescript
// Add to tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@env/*": ["src/environments/*"]
    }
  }
}
```

---

## ✅ Migration Checklist

Use this checklist to track your migration progress:

- [ ] Environment files created (`environment.ts`, `environment.prod.ts`)
- [ ] Core services implemented (Logger, ErrorHandler)
- [ ] Domain models created (IfcModel, interfaces)
- [ ] Services refactored with error handling
- [ ] Console.log/error replaced with LoggerService
- [ ] Error handling updated to use AppError
- [ ] Component imports updated
- [ ] Tests written for new services
- [ ] App config updated with ErrorHandler provider
- [ ] Build passes without errors
- [ ] All features working in development
- [ ] Production build tested

---

## 📚 Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [API Reference](./API.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

---

## 🆘 Getting Help

If you encounter issues during migration:

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review error logs in browser console
3. Verify all imports are updated
4. Check that environment files are correctly configured
5. Run tests to identify breaking changes

---

## 📝 Example: Complete Migration

See [examples/migration-example.md](./examples/migration-example.md) for a complete before/after comparison of migrating the ViewerComponent.
