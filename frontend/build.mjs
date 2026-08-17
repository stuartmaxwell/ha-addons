import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Build output lands inside the add-on folder so the Supervisor's Docker
// build (whose context is the add-on folder alone) can COPY it.
const outdir = fileURLToPath(new URL("../whiteboard/www/", import.meta.url));

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

await esbuild.build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  minify: true,
  format: "esm",
  splitting: true,
  outdir,
  jsx: "automatic",
  // @excalidraw/excalidraw's package exports resolve via this condition.
  conditions: ["production"],
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.IS_PREACT": '"false"',
  },
  loader: { ".woff2": "file", ".ttf": "file", ".svg": "dataurl" },
  logLevel: "info",
});

copyFileSync("src/index.html", `${outdir}index.html`);
cpSync("node_modules/@excalidraw/excalidraw/dist/prod/fonts", `${outdir}fonts`, {
  recursive: true,
});

console.log(`Built to ${outdir}`);
