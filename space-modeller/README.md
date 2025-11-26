# Space Modeller - Production-Ready IFC Viewer

A professional-grade IFC (Industry Foundation Classes) viewer built with Angular 18, Three.js, and web-ifc. Designed for production use with enterprise-level error handling, logging, and performance optimization.

---

## ✨ Features

- 🏗️ **Full IFC Support**: Load and visualize IFC 2x3 and IFC 4 models
- 🎨 **Accurate Rendering**: True colors, transparency, and material properties
- 📊 **Performance Optimized**: Handles large models (>100MB) efficiently
- 🔍 **Advanced Camera Controls**: Orbit, pan, zoom with smooth animations
- 📱 **Responsive**: Works on desktop and tablet devices
- 🛡️ **Production Ready**: Comprehensive error handling and logging
- 🧪 **Fully Tested**: Unit and integration tests included
- 📚 **Well Documented**: Complete API and architecture documentation

---

## 🚀 Quick Start

### **Prerequisites**

- Node.js 18+ and npm 9+
- Modern browser with WebGL 2.0 support

### **Installation**

```bash
# Clone the repository
git clone https://github.com/your-org/space-modeller.git
cd space-modeller

# Install dependencies
npm install

# Start development server
npm start
```

Open your browser to `http://localhost:4200`

### **Load an IFC Model**

1. Click "Load IFC" button
2. Select an `.ifc` file from your computer
3. Wait for the model to load
4. Use mouse to navigate:
   - **Left click + drag**: Rotate
   - **Right click + drag**: Pan
   - **Scroll**: Zoom

---

## 🏗️ Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | Angular | 18.2 |
| **3D Engine** | Three.js | 0.180 |
| **IFC Parser** | web-ifc | 0.0.73 |
| **Camera Controls** | camera-controls | 3.1.2 |
| **Language** | TypeScript | 5.5 |
| **Build Tool** | Angular CLI | 18.2 |
| **Testing** | Jasmine + Karma | Latest |

---

## 📦 Project Structure

```
space-modeller/
├── src/
│   ├── app/
│   │   ├── core/                 # Core infrastructure
│   │   │   ├── config/          # Configuration management
│   │   │   ├── logging/         # Logging service
│   │   │   └── errors/          # Error handling
│   │   ├── domain/              # Business logic
│   │   │   ├── models/          # Domain models
│   │   │   ├── services/        # Business services
│   │   │   └── interfaces/      # Type definitions
│   │   ├── infrastructure/      # External integrations
│   │   │   ├── threejs/        # Three.js wrapper
│   │   │   └── web-ifc/        # web-ifc wrapper
│   │   └── features/            # UI features
│   │       └── viewer/          # Main 3D viewer
│   ├── environments/            # Environment configs
│   └── assets/
│       └── wasm/                # WASM files
├── docs/                        # Documentation
├── ARCHITECTURE.md              # Architecture guide
├── MIGRATION.md                 # Migration guide
└── README.md                    # This file
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed structure explanation.

---

## 🔧 Configuration

### **Environment Variables**

The application uses environment-based configuration:

**Development** (`src/environments/environment.ts`):
```typescript
export const environment = {
  production: false,
  wasm: {
    path: 'https://unpkg.com/web-ifc@0.0.73/',
    useCdn: true,
  },
  logging: {
    enabled: true,
    level: 'debug',
  },
  features: {
    showStats: true,
    showGrid: true,
  },
};
```

**Production** (`src/environments/environment.prod.ts`):
```typescript
export const environment = {
  production: true,
  wasm: {
    path: '/wasm/',        // Local WASM files
    useCdn: false,
  },
  logging: {
    enabled: true,
    level: 'error',
    sendToServer: true,   // Send errors to server
  },
  features: {
    showStats: false,
    showGrid: false,
  },
};
```

### **Viewer Configuration**

Customize viewer behavior via `ViewerConfig`:

```typescript
import { DEFAULT_VIEWER_CONFIG } from './domain/interfaces/viewer-config.interface';

const customConfig: ViewerConfig = {
  ...DEFAULT_VIEWER_CONFIG,
  camera: {
    fov: 60,
    position: [20, 20, 20],
  },
  renderer: {
    backgroundColor: '#ffffff',
    antialias: true,
  },
  performance: {
    maxMemoryMB: 1024,
    enableFrustumCulling: true,
  },
};
```

---

## 🛠️ Development

### **Available Scripts**

```bash
# Development server (http://localhost:4200)
npm start

# Production build
npm run build

# Run unit tests
npm test

# Watch mode for tests
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format
```

### **Development Workflow**

1. **Make changes** to source files
2. **Run tests**: `npm test`
3. **Check linting**: `npm run lint`
4. **Build**: `npm run build`
5. **Commit** your changes

### **Code Style**

- Use **TypeScript strict mode**
- Follow **Angular style guide**
- Use **OnPush change detection**
- Write **unit tests** for all services
- Document **public APIs**

---

## 🧪 Testing

### **Run All Tests**

```bash
npm test
```

### **Run Specific Tests**

```bash
# Test a specific file
npm test -- --include='**/ifc-loader.service.spec.ts'
```

### **Test Coverage**

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

### **Writing Tests**

Example service test:

```typescript
describe('IfcLoaderService', () => {
  let service: IfcLoaderService;
  let logger: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    logger = jasmine.createSpyObj('LoggerService', ['info', 'error']);
    TestBed.configureTestingModule({
      providers: [
        IfcLoaderService,
        { provide: LoggerService, useValue: logger },
      ],
    });
    service = TestBed.inject(IfcLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should throw error when not initialized', async () => {
    const file = new File([], 'test.ifc');
    await expectAsync(service.loadIfcFile(file))
      .toBeRejectedWithError();
  });
});
```

---

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: System architecture and design decisions
- **[MIGRATION.md](./MIGRATION.md)**: Guide for migrating from old architecture
- **[API.md](./docs/API.md)**: Complete API reference
- **[DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md)**: Development best practices
- **[TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)**: Common issues and solutions

---

## 🚀 Deployment

### **Production Build**

```bash
# Build for production
npm run build

# Output is in dist/space-modeller/
```

### **Production Checklist**

Before deploying to production:

- [ ] Environment variables configured (`environment.prod.ts`)
- [ ] WASM files copied to `public/wasm/` directory
- [ ] Error logging configured (remote endpoint)
- [ ] Bundle size optimized (<5MB)
- [ ] Security headers configured
- [ ] HTTPS enabled
- [ ] CORS configured for WASM files
- [ ] CDN configured (optional)

### **Deployment Examples**

#### **Nginx**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/space-modeller;
    index index.html;

    # Serve WASM files with correct MIME type
    location ~ \.wasm$ {
        types { application/wasm wasm; }
        add_header Cache-Control "public, max-age=31536000";
    }

    # Angular routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### **Docker**

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist/space-modeller /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🔍 Monitoring

### **Error Tracking**

Errors are automatically logged and can be sent to a remote server:

```typescript
// In environment.prod.ts
logging: {
  sendToServer: true,
}

// Configure API endpoint
apiUrl: 'https://your-api.com',
```

### **Performance Monitoring**

Monitor performance metrics:

```typescript
import { PerformanceService } from './core/performance/performance.service';

// Track memory usage
const memoryUsage = this.performance.getMemoryUsage();

// Track frame rate
const fps = this.performance.getCurrentFPS();
```

---

## 🛡️ Security

### **Content Security Policy**

Recommended CSP headers:

```
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'unsafe-eval'; 
  worker-src 'self' blob:; 
  style-src 'self' 'unsafe-inline';
```

### **WASM Security**

- Use Subresource Integrity (SRI) for CDN WASM files
- Host WASM files locally in production
- Verify WASM file integrity

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### **Development Process**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests
5. Run tests and linting
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

---

## 🆘 Support

### **Getting Help**

- 📖 Read the [documentation](./docs/)
- 🐛 Report bugs via [GitHub Issues](https://github.com/your-org/space-modeller/issues)
- 💬 Ask questions in [Discussions](https://github.com/your-org/space-modeller/discussions)

### **Troubleshooting**

See [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) for common issues and solutions.

---

## 🙏 Acknowledgments

- **Three.js**: Amazing 3D library
- **web-ifc**: Powerful IFC parser
- **That Open Company**: IFC ecosystem
- **Angular Team**: Excellent framework

---

## 📊 Project Status

- ✅ **Production Ready**: Stable and tested
- 🔄 **Active Development**: Regular updates
- 📈 **Growing**: New features planned

---

**Built with ❤️ by the Space Modeller Team**
