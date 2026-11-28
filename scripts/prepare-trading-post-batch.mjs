import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { validateInventory } from "../src/trading-post/catalog.mjs";
import { prepareShopPhoto, validateShopPhotos } from "./trading-post-pages.mjs";

const columns = (await readFile(new URL("../docs/trading-post-items.csv", import.meta.url), "utf8"))
  .trim().split(",");

function readCsv(input) {
  const source = input.replace(/^\ufeff/, "");
  const field = /("(?:[^"]|"")*"|[^",\r\n]*)(,|\r\n|[\r\n]|$)/y;
  const rows = [];
  let row = [];
  let position = 0;
  while (position < source.length) {
    const match = field.exec(source);
    if (!match?.[0].length) throw new Error("Invalid CSV near row " + (rows.length + 1));
    position = field.lastIndex;
    row.push(match[1].startsWith('"') ? match[1].slice(1, -1).replaceAll('""', '"') : match[1]);
    if (match[2] !== ",") {
      rows.push(row);
      row = [];
    }
  }
  if (row.length) rows.push([...row, ""]);
  return rows;
}

function priceInCents(value, row) {
  const price = value.match(/^\$?\s*(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/);
  if (!price) throw new Error("Invalid USD price on CSV row " + row);
  const dollars = Number(price[1].replaceAll(",", ""));
  const cents = Number((price[2] ?? "").padEnd(2, "0"));
  return dollars * 100 + cents;
}

export function inventoryFromCsv(input) {
  if (Buffer.byteLength(input) > 256_000) throw new Error("CSV exceeds 256 kB");
  const [header, ...rows] = readCsv(input);
  if (!header || header.length !== columns.length ||
      new Set(header).size !== columns.length || columns.some(name => !header.includes(name))) {
    throw new Error("Use the column headings in docs/trading-post-items.csv");
  }
  const items = [];
  for (const [index, row] of rows.entries()) {
    if (row.every(value => !value.trim())) continue;
    const rowNumber = index + 2;
    if (row.length !== header.length) throw new Error("Incorrect column count on CSV row " + rowNumber);
    const entry = Object.fromEntries(header.map((name, index) => [name, row[index].trim()]));
    // Only photo descriptions are multiline after export. Preserve punctuation in the other notes.
    const plain = value => value.replace(/[\r\n]+/g, " ");
    const photos = entry["Photo descriptions"].split(/\r?\n|\r/).map(value => value.trim())
      .map((alt, index) => ({ file: entry.Slug + "-" + (index + 1) + ".jpg", alt }));
    items.push({
      sku: entry.SKU,
      slug: entry.Slug,
      name: plain(entry.Name),
      category: entry.Category,
      condition: entry.Condition,
      wear: plain(entry.Wear),
      tested: plain(entry.Testing),
      included: plain(entry.Includes),
      priceCents: priceInCents(entry["Price (USD)"], rowNumber),
      status: entry.Status,
      listingUrl: entry["Listing URL"] || null,
      photos,
    });
  }
  if (!items.length) throw new Error("Add at least one item to the CSV");
  const { items: checked } = validateInventory({ published: false, items });
  return { published: false, items: items.map((item, index) => ({
    ...item, listingUrl: checked[index].market?.href ?? null,
  })) };
}

export async function prepareBatch(csv, inputDirectory, outputDirectory) {
  const manifest = inventoryFromCsv(csv);
  const names = new Map(manifest.items.flatMap(item => item.photos.map((photo, index) => [
    (item.sku + "-" + (index + 1)).toLowerCase(), photo.file,
  ])));
  const sources = new Map();
  for (const entry of await readdir(inputDirectory, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const key = entry.name.match(/^(kt-\d{4,6}-[1-6])\.(?:jpe?g|png)$/i)?.[1].toLowerCase();
    if (!entry.isFile() || !names.has(key)) {
      throw new Error("Unexpected photo copy. Use the SKU, photo number, and JPG or PNG extension.");
    }
    if (sources.has(key)) throw new Error("Multiple photo copies for " + key.toUpperCase());
    sources.set(key, entry.name);
  }
  for (const key of names.keys()) {
    if (!sources.has(key)) throw new Error("Missing photo copy for " + key.toUpperCase());
  }

  // Reserving the folder prevents one run from overwriting an existing batch.
  await mkdir(outputDirectory, { mode: 0o700 });
  try {
    const photos = join(outputDirectory, "photos");
    await mkdir(photos);
    for (const [key, filename] of sources) {
      await prepareShopPhoto(join(inputDirectory, filename), join(photos, names.get(key)));
    }
    await validateShopPhotos(manifest.items, photos);
    await writeFile(join(outputDirectory, "inventory.json"), JSON.stringify(manifest, null, 2) + "\n", {
      flag: "wx", mode: 0o600,
    });
  } catch (error) {
    await rm(outputDirectory, { recursive: true, force: true });
    throw error;
  }
  return manifest.items.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [csv, photos, output, ...extra] = process.argv.slice(2);
    if (!csv || !photos || !output || extra.length) {
      throw new Error("Usage: node scripts/prepare-trading-post-batch.mjs <items.csv> <photos-folder> <new-output-folder>");
    }
    const count = await prepareBatch(await readFile(csv, "utf8"), photos, output);
    console.log(`Prepared ${count} item(s) for review. Publication is off.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
