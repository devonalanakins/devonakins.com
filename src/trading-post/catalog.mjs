import { readFileSync } from "node:fs";

export const shopHome = "/shop/";
export const shopArchive = "/shop/archive/";

const categories = [
  "Arcade", "Library", "Workshop", "Tech Vault", "Curiosities", "Garden", "Clothing & Shoes",
];
const conditions = ["Like new", "Very good", "Good", "Fair", "For parts"];
const itemKeys = ["sku", "slug", "name", "category", "condition", "wear", "tested",
  "included", "priceCents", "status", "listingUrl", "photos"];

function fail(field) {
  throw new Error("Invalid Trading Post inventory field: " + field);
}

function record(value, allowed, field) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).some(key => !allowed.includes(key))) fail(field);
}

function text(value, max, field) {
  if (typeof value !== "string" || !value.trim() || value.length > max ||
      /[\u0000-\u001f\u007f]/.test(value)) fail(field);
  return value.trim();
}

function marketplaceUrl(value) {
  let url;
  try {
    url = new URL(text(value, 500, "listingUrl"));
  } catch {
    fail("listingUrl");
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password) fail("listingUrl");

  const ebay = url.pathname.match(/^\/itm\/(?:[^/]+\/)?(\d{9,15})\/?$/);
  if (["www.ebay.com", "ebay.com"].includes(url.hostname) && ebay) {
    return { href: "https://www.ebay.com/itm/" + ebay[1], name: "eBay" };
  }
  const facebook = url.pathname.match(/^\/marketplace\/item\/(\d{6,25})\/?$/);
  if (["www.facebook.com", "facebook.com", "m.facebook.com"].includes(url.hostname) && facebook) {
    return { href: "https://www.facebook.com/marketplace/item/" + facebook[1] + "/", name: "Facebook Marketplace" };
  }
  fail("listingUrl");
}

export function validateInventory(source) {
  record(source, ["published", "items"], "root");
  if (typeof source.published !== "boolean" || !Array.isArray(source.items) ||
      source.items.length > 150 || (source.published && !source.items.length)) fail("items or published");

  const ids = new Set();
  const slugs = new Set();
  const links = new Set();
  const items = source.items.map(item => {
    record(item, itemKeys, "item");
    const { sku, slug, category, condition, priceCents, status } = item;
    if (typeof sku !== "string" || !/^KT-\d{4,6}$/.test(sku) || ids.has(sku)) fail("sku");
    if (typeof slug !== "string" || slug.length > 72 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
        slugs.has(slug)) fail("slug");
    if (!categories.includes(category) || !conditions.includes(condition)) fail("category or condition");
    if (!Number.isSafeInteger(priceCents) || priceCents < 1 || priceCents > 10_000_000) fail("priceCents");
    if (status !== "available" && status !== "sold") fail("status");
    if (status === "sold" && item.listingUrl != null) fail("remove the listing URL from sold items");
    const market = status === "available" ? marketplaceUrl(item.listingUrl) : null;
    if (market && links.has(market.href)) fail("duplicate listingUrl");

    const { photos } = item;
    if (!Array.isArray(photos) || !photos.length || photos.length > 6) fail("photos");
    const imageFiles = new Set();
    const checkedPhotos = photos.map(photo => {
      record(photo, ["file", "alt"], "photo");
      const pattern = new RegExp("^" + slug + "-[1-6]\\.jpg$");
      if (typeof photo.file !== "string" || !pattern.test(photo.file) ||
          imageFiles.has(photo.file)) fail("photo file");
      imageFiles.add(photo.file);
      return { file: photo.file, alt: text(photo.alt, 180, "photo alt") };
    });
    ids.add(sku);
    slugs.add(slug);
    if (market) links.add(market.href);
    return { sku, slug, category, condition, priceCents, status, market, photos: checkedPhotos,
      name: text(item.name, 110, "name"), wear: text(item.wear, 650, "wear"),
      tested: text(item.tested, 300, "tested"), included: text(item.included, 300, "included") };
  });
  return { published: source.published, items };
}

export const inventory = validateInventory(JSON.parse(
  readFileSync(new URL("./inventory.json", import.meta.url), "utf8"),
));
export const shopPreview = process.env.TRADING_POST_PREVIEW === "1";
export const shopEnabled = inventory.published || shopPreview;
export const itemPath = item => shopHome + "item/" + item.slug + "/";
export const shopPaths = shopEnabled ? [shopHome, shopArchive, ...inventory.items.map(itemPath)] : [];
