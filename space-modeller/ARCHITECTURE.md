# Space Modeller - Production Architecture

## 📐 Architecture Overview

This application follows a **layered architecture** pattern designed for maintainability, testability, and scalability.

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│            (Features, Components, UI Logic)              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    Domain Layer                          │
│       (Business Logic, Models, Interfaces, Services)     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 Infrastructure Layer                     │
│     (External APIs, Three.js, web-ifc, Storage)          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                     Core Layer                           │
│   (Configuration, Logging, Error Handling, Utilities)    │
└──────────────────────────────────────────────────────────┘
```

---

## 🗂️ Folder Structure

```
src/
├── app/
│   ├── core/                          # Core infrastructure (singleton services)
│   │   ├── config/                    # Configuration management
│   │   │   ├── app.config.ts
│   │   │   └── config.service.ts
│   │   ├── logging/                   # Centralized logging
│   │   │   ├── logger.service.ts
│   │   │   └── log-level.enum.ts
│   │   ├── errors/                    # Error handling infrastructure
│   │   │   ├── app-error.ts           # Custom error classes
│   │   │   ├── error-codes.enum.ts    # Error code definitions
│   │   │   └── error-handler.service.ts
│   │   └── performance/               # Performance monitoring
│   │       └── performance.service.ts
│   │
│   ├── domain/                        # Business logic & domain models
│   │   ├── models/                    # Domain models
│   │   │   ├── ifc-model.model.ts     # IFC model representation
│   │   │   └── geometry.model.ts      # Geometry models
│   │   ├── services/                  # Domain services
│   │   │   ├── ifc-loader.service.ts  # IFC loading logic
│   │   │   └── model-manager.service.ts
│   │   └── interfaces/                # Domain interfaces
│   │       └── viewer-config.interface.ts
│   │
│   ├── infrastructure/                # External integrations
│   │   ├── threejs/                   # Three.js wrapper
│   │   │   ├── scene-manager.service.ts
│   │   │   └── renderer.service.ts
│   │   └── web-ifc/                   # web-ifc wrapper
│   │       └── ifc-api.service.ts
│   │
│   ├── features/                      # Feature modules
│   │   ├── viewer/                    # 3D viewer feature
│   │   │   ├── viewer.component.ts
│   │   │   ├── viewer.component.html
│   │   │   ├── viewer.component.css
│   │   │   └── viewer.component.spec.ts
│   │   └── shared/                    # Shared UI components
│   │       └── components/
│   │           ├── loading-indicator/
│   │           └── error-display/
│   │
│   └── shared/                        # Shared utilities
│       ├── utils/                     # Utility functions
│       └── constants/                 # App-wide constants
│
├── environments/                      # Environment configurations
│   ├── environment.ts                 # Development config
│   └── environment.prod.ts            # Production config
│
└── assets/
    └── wasm/                          # WASM files for production
```

---

## 🏛️ Layer Responsibilities

### **1. Core Layer**
**Purpose**: Application-wide infrastructure that all other layers depend on.

- **Configuration**: Environment-based configuration management
- **Logging**: Centralized logging with levels and remote reporting
- **Error Handling**: Custom error types, error codes, and error boundaries
- **Performance**: Performance monitoring and metrics

**Rules:**
- ✅ Can be imported by any layer
- ❌ Cannot import from other layers (except Angular core)
- ✅ All services are singletons (`providedIn: 'root'`)

### **2. Domain Layer**
**Purpose**: Business logic and domain models independent of external frameworks.

- **Models**: Domain entities (IfcModel, Geometry, CameraState)
- **Services**: Business logic (IfcLoaderService, ModelManagerService)
- **Interfaces**: Contracts and data structures

**Rules:**
- ✅ Can import from Core layer
- ❌ Cannot import from Infrastructure or Features
- ✅ Framework-agnostic where possible
- ✅ Contains business rules and validation

### **3. Infrastructure Layer**
**Purpose**: Integration with external APIs and libraries.

- **Three.js Wrappers**: Encapsulation of Three.js API
- **web-ifc Wrappers**: Encapsulation of web-ifc API
- **Storage**: Local/remote data persistence

**Rules:**
- ✅ Can import from Core and Domain layers
- ❌ Cannot import from Features layer
- ✅ Provides adapters for external dependencies
- ✅ Handles low-level API interactions

### **4. Presentation Layer (Features)**
**Purpose**: UI components and user interaction logic.

- **Feature Modules**: Self-contained features (viewer, toolbar, inspector)
- **Components**: Angular components, templates, styles
- **Facades**: Simplified APIs for components

**Rules:**
- ✅ Can import from all other layers
- ✅ Handles user input and display
- ✅ Uses OnPush change detection
- ✅ Minimal business logic

---

## 🔄 Data Flow

### **User Action Flow:**
```
User Action (e.g., Load IFC)
    ↓
ViewerComponent
    ↓
ViewerFacadeService (orchestrates)
    ↓
IfcLoaderService (domain logic)
    ↓
IfcApiService (infrastructure)
    ↓
web-ifc library
    ↓
Result flows back through layers
    ↓
Component updates view (signals)
```

### **Error Flow:**
```
Error occurs
    ↓
Caught by service
    ↓
Wrapped in AppError
    ↓
Logged by LoggerService
    ↓
Handled by AppErrorHandler
    ↓
UI displays user-friendly message
```

---

## 🛡️ Error Handling Strategy

### **Error Types:**
1. **AppError**: Base error with code, user message, and recoverability
2. **ViewerInitError**: Non-recoverable viewer initialization failure
3. **IfcLoadError**: Recoverable file loading failure
4. **WasmLoadError**: Non-recoverable WASM loading failure

### **Error Codes:**
All errors have typed error codes (enum) for:
- Consistent error handling
- Internationalization support
- Debugging and monitoring

### **Error Flow:**
1. Catch error at service level
2. Wrap in appropriate AppError type
3. Log with context via LoggerService
4. Notify UI via error handler
5. Display user-friendly message
6. Optionally report to server (production)

---

## 📊 Logging Strategy

### **Log Levels:**
- **Debug**: Detailed information for development
- **Info**: General informational messages
- **Warn**: Warning messages (non-critical issues)
- **Error**: Error messages with stack traces

### **Configuration:**
- Development: Debug level, console only
- Production: Error level, send to server

### **Log Format:**
```typescript
{
  timestamp: Date,
  level: LogLevel,
  message: string,
  context: string,      // Service/component name
  data?: any,           // Additional context
  error?: Error         // Original error object
}
```

---

## ⚙️ Configuration Management

### **Environment-Based:**
- `environment.ts`: Development settings
- `environment.prod.ts`: Production settings

### **Configuration Categories:**
1. **WASM Config**: CDN vs local paths
2. **Logging Config**: Levels, remote reporting
3. **Feature Flags**: Enable/disable features
4. **Performance Config**: Memory limits, metrics

### **Usage:**
```typescript
import { environment } from '@env/environment';

if (environment.logging.enabled) {
  this.logger.info('Message');
}
```

---

## 🧪 Testing Strategy

### **Unit Tests:**
- All services have `.spec.ts` files
- Mock dependencies using Angular testing utilities
- Test business logic in isolation

### **Component Tests:**
- Test component behavior, not implementation
- Use TestBed for Angular-specific tests
- Mock services and external dependencies

### **Integration Tests:**
- Test feature workflows end-to-end
- Mock external APIs (web-ifc, Three.js)
- Verify error handling and edge cases

---

## 🚀 Performance Considerations

### **Memory Management:**
1. Dispose Three.js resources properly
2. Clear geometry/materials when unloading models
3. Monitor memory usage via PerformanceService
4. Set memory limits in config

### **Rendering Optimization:**
1. Enable frustum culling
2. Use LOD (Level of Detail) for large models
3. Batch geometry where possible
4. Throttle render loop updates

### **Loading Optimization:**
1. Stream large IFC files
2. Progress feedback for user
3. Cancel long-running operations
4. Cache processed models

---

## 🔐 Security Considerations

### **Input Validation:**
- Validate file types before processing
- Check file size limits
- Sanitize user input

### **WASM Security:**
- Verify WASM integrity
- Use CDN with SRI (Subresource Integrity)
- Fallback to local WASM if CDN fails

### **Error Messages:**
- Don't expose internal paths in production
- Log detailed errors server-side only
- Show user-friendly messages only

---

## 📦 Deployment

### **Build Configuration:**
```bash
# Development
npm start

# Production build
npm run build

# Run tests
npm test
```

### **Production Checklist:**
- [ ] Environment variables configured
- [ ] WASM files copied to `/assets/wasm/`
- [ ] Logging configured for remote reporting
- [ ] Error tracking service integrated
- [ ] Bundle size optimized
- [ ] Security headers configured

---

## 🔄 Migration from Old Architecture

### **Key Changes:**
1. **Services refactored** with error handling and logging
2. **Domain models** introduced for type safety
3. **Configuration centralized** via environment files
4. **Error handling** unified with custom error types
5. **Logging infrastructure** added throughout

### **Migration Steps:**
See [MIGRATION.md](./MIGRATION.md) for detailed step-by-step guide.

---

## 📚 Further Reading

- [Developer Guide](./DEVELOPER_GUIDE.md)
- [API Documentation](./API.md)
- [Contributing Guidelines](./CONTRIBUTING.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
