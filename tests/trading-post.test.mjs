import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { validateShopPhotos } from "../scripts/trading-post-pages.mjs";
import { inventoryFromCsv, prepareBatch } from "../scripts/prepare-trading-post-batch.mjs";
import { itemPath, validateInventory } from "../src/trading-post/catalog.mjs";
import { renderShop } from "../src/trading-post/views.mjs";

const entry = {
  sku: "KT-0001",
  slug: "test-board-game",
  name: 'Test board game <script>alert("fixture")</script>',
  category: "Arcade",
  condition: "Good",
  wear: 'Box corner split. <img src=x onerror="alert(1)">',
  tested: "Counted the pieces against the manual.",
  included: "Game, manual, and original box.",
  priceCents: 1895,
  status: "available",
  listingUrl: "https://www.ebay.com/itm/test-game/123456789012?source=ignored#test",
  photos: [{ file: "test-board-game-1.jpg", alt: 'Splitting on the "front" edge.' }],
};
const withItems = (...items) => validateInventory({ published: true, items });

test("available, sold and empty views expose the right purchasing controls", () => {
  const active = withItems(entry);
  const path = itemPath(active.items[0]);
  const item = renderShop(active, path, true);
  assert.match(item, /\$18\.95/);
  assert.match(item, /href="https:\/\/www\.ebay\.com\/itm\/123456789012"/);
  assert.doesNotMatch(item, /source=ignored|<script>alert|<img src=x/);
  assert.match(item, /Box corner split\. &lt;img/);
  assert.match(item, /alt="Splitting on the &quot;front&quot; edge\."/);
  assert.match(renderShop(active, "/shop/", true), /data-listing/);
  assert.match(renderShop(active, "/shop/archive/", true), /No sold items/);
  const sold = withItems({ ...entry, status: "sold", listingUrl: null });
  assert.match(renderShop(sold, "/shop/archive/", true), /data-listing/);
  assert.doesNotMatch(renderShop(sold, path, true), /www\.ebay\.com|View on eBay/);
  assert.doesNotMatch(renderShop(sold, "/shop/", true), /data-listing/);
  const preview = renderShop(validateInventory({ published: false, items: [] }), "/shop/", false);
  assert.match(preview, /noindex, nofollow/);
  assert.match(preview, /no items available/);
  assert.throws(() => withItems(), /published/);
});

test("inventory rejects unsafe URLs, duplicate records, private fields, and unsafe photo paths", () => {
  for (const listingUrl of [
    "https://www.ebay.com.example.com/itm/123456789012",
    "https://www.ebay.com@evil.example/itm/123456789012",
    "https://www.ebay.com:9999/itm/123456789012",
    "javascript:alert(1)",
    "https://www.ebay.com/signin",
  ]) {
    assert.throws(() => withItems({ ...entry, listingUrl }), /listingUrl/);
  }
  const market = withItems({ ...entry, listingUrl: "https://m.facebook.com/marketplace/item/1234567/?ref=test" }).items[0].market;
  assert.deepEqual(market, { href: "https://www.facebook.com/marketplace/item/1234567/", name: "Facebook Marketplace" });
  assert.throws(() => withItems(entry, { ...entry }), /sku/);
  assert.throws(() => withItems(entry, { ...entry, sku: "KT-0002", slug: "another" }), /duplicate listingUrl/);
  assert.throws(() => withItems({ ...entry, acquisitionCost: 0 }), /item/);
  assert.throws(() => withItems({ ...entry, priceCents: 1.7 }), /priceCents/);
  assert.throws(() => withItems({ ...entry, slug: "../unsafe" }), /slug/);
  assert.throws(() => withItems({ ...entry, photos: [{ file: "../private.jpg", alt: "Photo" }] }), /photo file/);
  assert.throws(() => withItems({ ...entry, status: "sold" }), /remove the listing URL/);
});

test("only manifest-listed JPEG photos without embedded metadata can be released", async () => {
  const folder = await mkdtemp(join(tmpdir(), "trading-post-test-"));
  const source = sharp({ create: { width: 25, height: 25, channels: 3, background: "#456450" } });
  const output = join(folder, entry.photos[0].file);
  const { items } = withItems(entry);
  try {
    await assert.rejects(validateShopPhotos(items, folder), /Missing Trading Post photos/);
    await source.clone().jpeg().toFile(output);
    assert.deepEqual(await validateShopPhotos(items, folder), [entry.photos[0].file]);
    await source.clone().withExif({ IFD0: { Artist: "Fixture" } }).jpeg().toFile(output);
    await assert.rejects(validateShopPhotos(items, folder), /prepared Trading Post JPEG/);
    await source.clone().jpeg().toFile(output);
    await writeFile(join(folder, "original.jpg"), "unapproved file");
    await assert.rejects(validateShopPhotos(items, folder), /Unapproved Trading Post photo/);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

const header = "SKU,Slug,Name,Category,Condition,Wear,Testing,Includes,Price (USD),Status,Listing URL,Photo descriptions";
const csvRow = [
  "KT-0001", "board-game", "Board game", "Arcade", "Good", '"Box, one ""small"" split"',
  "Counted parts", "Box and contents", '"$1,234.50"', "available",
  "https://www.ebay.com/itm/123456789012?source=remove", '"Front of box\r\nBack of box"',
].join(",");

test("Numbers CSV handles quoted cells and leaves the reviewed batch unpublished", () => {
  const csv = "\ufeff" + header + "\r\n" + csvRow;
  const result = inventoryFromCsv(csv);
  assert.equal(result.published, false);
  assert.equal(result.items[0].wear, 'Box, one "small" split');
  assert.equal(result.items[0].priceCents, 123450);
  assert.equal(result.items[0].listingUrl, "https://www.ebay.com/itm/123456789012");
  assert.deepEqual(result.items[0].photos, [
    { file: "board-game-1.jpg", alt: "Front of box" },
    { file: "board-game-2.jpg", alt: "Back of box" },
  ]);
  assert.throws(() => inventoryFromCsv(header + "\n" + csvRow + "\n" + csvRow), /sku/);
  assert.throws(() => inventoryFromCsv(header + "\n" + csvRow.slice(0, -1)), /Invalid CSV/);
  assert.throws(() => inventoryFromCsv(header.replace("Wear", "Buyer address") + "\n" + csvRow), /column headings/);
  assert.throws(() => inventoryFromCsv(header + "\n" + csvRow.replace("board-game", "../board-game")), /slug/);
  assert.throws(() => inventoryFromCsv(header + "\n" + csvRow.replace("$1,234.50", "$1,234.501")), /USD price/);
});

test("batch preparation strips metadata and rolls back a failed batch without overwriting an existing one", async () => {
  const folder = await mkdtemp(join(tmpdir(), "trading-post-batch-"));
  const photos = join(folder, "input");
  const output = join(folder, "output");
  const first = join(photos, "KT-0001-1.JPG");
  const second = join(photos, "KT-0001-2.png");
  const csv = header + "\n" + csvRow;
  try {
    await mkdir(photos);
    const image = sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#456450" } });
    await image.clone().withExif({ IFD0: { Artist: "Private name" } }).jpeg().toFile(first);
    await assert.rejects(prepareBatch(csv, photos, output), /Missing photo copy/);
    await assert.rejects(stat(output), { code: "ENOENT" });
    await writeFile(second, "broken image");
    await assert.rejects(prepareBatch(csv, photos, output), /image format/);
    await assert.rejects(stat(output), { code: "ENOENT" });
    await image.clone().png().toFile(second);
    assert.equal(await prepareBatch(csv, photos, output), 1);
    const manifest = await readFile(join(output, "inventory.json"), "utf8");
    assert.equal(JSON.parse(manifest).published, false);
    const prepared = await sharp(join(output, "photos", "board-game-1.jpg")).metadata();
    assert.equal(prepared.width, 1400);
    assert.equal(prepared.exif, undefined);
    await assert.rejects(prepareBatch(csv, photos, output), { code: "EEXIST" });
    assert.equal(await readFile(join(output, "inventory.json"), "utf8"), manifest);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
