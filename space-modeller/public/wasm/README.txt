This directory should contain the web-ifc WASM files for production builds.

To set up local WASM files (recommended for production):

1. Copy WASM files from node_modules:
   - web-ifc.wasm
   - web-ifc-mt.wasm

   On Windows (PowerShell):
   Copy-Item node_modules\web-ifc\*.wasm public\wasm\

   On Mac/Linux:
   cp node_modules/web-ifc/*.wasm public/wasm/

2. Update viewer-config.model.ts to use local path:
   wasm: {
     path: '/wasm/',
     useCdn: false,
   }

For development, you can use the CDN (current default):
   wasm: {
     path: 'https://unpkg.com/web-ifc@0.0.73/',
     useCdn: true,
   }
