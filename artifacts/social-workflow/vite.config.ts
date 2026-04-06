import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT || "5173";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || "/";

function viteTerminalLogPlugin() {
  return {
    name: 'vite-terminal-log-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url === '/__terminal_log' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: string) => body += chunk);
          req.on('end', () => {
            try {
              const { type, message } = JSON.parse(body);
              const prefix = '\x1b[36m[CLIENT]\x1b[0m ';
              if (type === 'error') console.error(prefix + '\x1b[31m' + message + '\x1b[0m');
              else if (type === 'warn') console.warn(prefix + '\x1b[33m' + message + '\x1b[0m');
              else console.log(prefix + message);
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end('ok');
            } catch(e) { res.end('err'); }
          });
        } else if (req.url === '/__terminal_log' && req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.end();
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    viteTerminalLogPlugin(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
