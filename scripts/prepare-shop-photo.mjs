import { mkdir } from "node:fs/promises";
import { prepareShopPhoto } from "./trading-post-pages.mjs";

const [source, name, ...extra] = process.argv.slice(2);
if (!source || !name || extra.length || !/^[a-z0-9]+(?:-[a-z0-9]+)*-[1-6]\.jpg$/.test(name)) {
  throw new Error("Usage: node scripts/prepare-shop-photo.mjs <source-image> <item-slug>-<1–6>.jpg");
}

const directory = "src/trading-post/photos";
const output = directory + "/" + name;
await mkdir(directory, { recursive: true });
await prepareShopPhoto(source, output);
console.log("Prepared " + output);
