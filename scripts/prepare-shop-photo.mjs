import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const [source, name, ...extra] = process.argv.slice(2);
if (!source || !name || extra.length || !/^[a-z0-9]+(?:-[a-z0-9]+)*-[1-6]\.jpg$/.test(name)) {
  throw new Error("Usage: node scripts/prepare-shop-photo.mjs <source-image> <item-slug>-<1–6>.jpg");
}

const directory = "src/trading-post/photos";
const output = directory + "/" + name;
await mkdir(directory, { recursive: true });
await sharp(source)
  .autoOrient()
  .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(output);
console.log("Prepared " + output);
