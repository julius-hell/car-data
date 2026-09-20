// Stages Tesseract.js into public/ocr so the odometer scanner runs from our
// own origin (no CDN, works offline). Runs before `next dev` and `next build`.
import { copyFile, mkdir, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "public", "ocr");

const workerSrc = require.resolve("tesseract.js/dist/worker.min.js");
// Resolve the core through tesseract.js so the versions always match.
const requireFromTesseract = createRequire(require.resolve("tesseract.js/package.json"));
const coreDir = path.dirname(requireFromTesseract.resolve("tesseract.js-core/package.json"));
const langSrc = require.resolve("@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz");

await mkdir(path.join(out, "core"), { recursive: true });
await mkdir(path.join(out, "lang"), { recursive: true });

await copyFile(workerSrc, path.join(out, "worker.min.js"));
await copyFile(langSrc, path.join(out, "lang", "eng.traineddata.gz"));
// Only the LSTM cores are used; the worker picks the SIMD variant at runtime.
for (const file of await readdir(coreDir)) {
  if (/^tesseract-core-(relaxedsimd-|simd-)?lstm\.wasm(\.js)?$/.test(file)) {
    await copyFile(path.join(coreDir, file), path.join(out, "core", file));
  }
}
console.log("OCR assets staged in public/ocr");
