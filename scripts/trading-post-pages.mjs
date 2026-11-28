import { copyFile, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import sharp from "sharp";
import { inventory, shopEnabled, shopPaths, shopPreview } from "../src/trading-post/catalog.mjs";
import { renderShop } from "../src/trading-post/views.mjs";

const photoSource = "src/trading-post/photos";
const photoOutput = "public/shop-media";

export async function validateShopPhotos(items, source = photoSource) {
  const approved = new Set(items.flatMap(item => item.photos.map(photo => photo.file)));
  const files = await readdir(source, { withFileTypes: true }).catch(error => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  let total = 0;
  for (const file of files) {
    if (!file.isFile() || !approved.delete(file.name)) {
      throw new Error("Unapproved Trading Post photo: " + file.name);
    }
    const path = source + "/" + file.name;
    const { size } = await stat(path);
    if (size > 275_000) throw new Error("Trading Post photo exceeds 275 kB: " + file.name);
    total += size;
    const image = await sharp(path, { limitInputPixels: 2_000_000 }).metadata();
    if (image.format !== "jpeg" || image.width > 1400 || image.height > 1400 ||
        image.exif || image.iptc || image.xmp || image.comments?.length) {
      throw new Error("Use a prepared Trading Post JPEG: " + file.name);
    }
  }
  if (approved.size) throw new Error("Missing Trading Post photos: " + [...approved].join(", "));
  if (total > 1_000_000) throw new Error("Opening Trading Post photos exceed the 1 MB bundle allowance");
  return files.map(file => file.name);
}

export async function writeTradingPost() {
  await rm("shop", { recursive: true, force: true });
  await rm(photoOutput, { recursive: true, force: true });
  if (!shopEnabled) return [];

  const filenames = await validateShopPhotos(inventory.items);
  if (filenames.length) {
    await mkdir(photoOutput, { recursive: true });
    for (const filename of filenames) {
      await copyFile(photoSource + "/" + filename, photoOutput + "/" + filename);
    }
  }
  const indexable = inventory.published && !shopPreview;
  for (const path of shopPaths) {
    const output = "." + path + "index.html";
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, renderShop(inventory, path, indexable));
  }
  return indexable ? shopPaths : [];
}
