import {defineConfig} from 'vite';

// Preserve the browser-facing Host: the API checks Origin against this same origin.
const backend={target:'http://127.0.0.1:8800',changeOrigin:false};
export default defineConfig({server:{proxy:{'/api':backend,'/play115':backend},allowedHosts:['localhost','127.0.0.1']}});
