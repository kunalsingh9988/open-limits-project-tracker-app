import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

declare const Buffer: any;
declare const process: any;

const apiModules: Record<string, string> = {
  "/api/create-user": "api/create-user.js",
  "/api/update-password": "api/update-password.js",
  "/api/ensure-admin-profile": "api/ensure-admin-profile.js",
  "/api/login-credentials": "api/login-credentials.js",
};

async function readBody(req: any) {
  const chunks: any[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function localApiMiddleware(pathname: string) {
  return async (req: any, res: any, next: (error?: unknown) => void) => {
    if (req.url && req.url !== "/" && !req.url.startsWith("?")) return next();
    try {
      req.body = await readBody(req);
      const mod = await import(encodeURI(`file://${process.cwd()}/${apiModules[pathname]}`));
      await mod.default(req, res);
    } catch (error) {
      next(error);
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value;
  }

  return {
    plugins: [
      react(),
      {
        name: "open-limits-local-api",
        configureServer(server) {
          Object.keys(apiModules).forEach((pathname) => {
            server.middlewares.use(pathname, localApiMiddleware(pathname));
          });
        },
      },
    ],
  };
});
