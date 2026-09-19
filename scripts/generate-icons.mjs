// Renders public/icons/* from scripts/icon-source.svg. Run once: node scripts/generate-icons.mjs
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const source = await readFile(path.join(root, "scripts/icon-source.svg"));
const outDir = path.join(root, "public/icons");
await mkdir(outDir, { recursive: true });

const rounded = (size) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="#fff"/></svg>`,
  );

async function render(file, size, { maskable = false } = {}) {
  let image = sharp(source).resize(size, size);
  if (maskable) {
    // Maskable icons need the glyph inside the central 80% safe zone.
    const inner = Math.round(size * 0.8);
    const glyph = await sharp(source).resize(inner, inner).toBuffer();
    image = sharp({
      create: { width: size, height: size, channels: 4, background: "#2a78d6" },
    }).composite([{ input: glyph, gravity: "centre" }]);
  } else {
    image = image.composite([{ input: rounded(size), blend: "dest-in" }]);
  }
  await image.png().toFile(path.join(outDir, file));
  console.log(`wrote public/icons/${file}`);
}

await render("icon-192.png", 192);
await render("icon-512.png", 512);
await render("icon-512-maskable.png", 512, { maskable: true });
await render("apple-touch-icon.png", 180);
