import { itemPath, shopArchive, shopHome } from "./catalog.mjs";

const shopName = "Kahlua’s Trading Post";
const assets = "/src/trading-post/";
const escapes = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escape = value => String(value).replace(/[&<>"']/g, character => escapes[character]);
const formatPrice = cents => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD",
}).format(cents / 100);

const navLink = (url, label, current) => `<a href="${url}"${current ? ' aria-current="page"' : ""}>${label}</a>`;

function shell({ path, title, description, content, indexable }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escape(description)}">
  ${indexable ? "" : '<meta name="robots" content="noindex, nofollow">'}
  <link rel="canonical" href="https://devonakins.com${path}">
  <link rel="icon" href="${assets}brand-mark.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${assets}shop.css">
  <script type="module" src="${assets}shop.js"></script>
  <title>${escape(title)}</title>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="container bar">
      <a href="${shopHome}" class="brand"><img src="${assets}brand-mark.svg" width="44" height="44" alt=""><span>${shopName}</span></a>
      <nav aria-label="Shop">
        ${navLink(shopHome, "Shop", path === shopHome)}
        ${navLink(shopArchive, "Archive", path === shopArchive)}
      </nav>
    </div>
  </header>
  <main class="container main" id="main" tabindex="-1">${content}</main>
  <footer class="site-footer"><div class="container bar"><span>${shopName}</span><a href="/">DevonAkins.com</a></div></footer>
</body>
</html>`;
}

function photoMarkup(photo, className = "", eager = false) {
  return `<img class="${className}" src="/shop-media/${photo.file}" alt="${escape(photo.alt)}"${eager ? "" : ' loading="lazy"'} decoding="async">`;
}

function card(item) {
  const link = itemPath(item);
  return `<li data-listing data-category="${escape(item.category)}" data-price="${item.priceCents}" class="listing">
    <div class="listing-image">${photoMarkup(item.photos[0])}</div>
    <div class="listing-info">
      <p class="meta">${escape(item.category)} · ${escape(item.condition)}</p>
      <h3><a href="${link}">${escape(item.name)}</a></h3>
      <p class="price">${item.status === "sold" ? "Sold" : formatPrice(item.priceCents)}</p>
    </div>
  </li>`;
}

function grid(items, searchable = false) {
  const options = [...new Set(items.map(item => item.category))].sort();
  return `${searchable ? `<div class="filters" data-filters hidden>
    <label>Search<input type="search" id="query" placeholder="Name or condition"></label>
    <label>Category<select id="category"><option value="">All categories</option>
    ${options.map(category => `<option>${escape(category)}</option>`).join("")}
    </select></label>
    <label>Sort<select id="sort"><option value="">Featured</option><option value="low">Price, low to high</option><option value="high">Price, high to low</option></select></label>
    <button type="button" id="clear">Clear filters</button>
  </div><p class="meta result-count" data-result-count aria-live="polite" hidden></p>` : ""}
  <ul class="grid" data-listing-grid>${items.map(card).join("")}</ul>
  ${searchable ? '<p class="empty" data-no-results hidden>No items match those filters.</p>' : ""}`;
}

export function renderShop(catalog, path, indexable) {
  if (path === shopHome) {
    const available = catalog.items.filter(item => item.status === "available");
    return shell({ path, title: shopName, indexable,
      description: "Browse available secondhand finds with photos, condition notes, and links to their listings.",
      content: `<section class="hero" aria-labelledby="hero-heading">
        <div class="hero-copy">
          <p class="meta">Secondhand goods</p>
          <h1 id="hero-heading">Good things deserve a second life.</h1>
          <p>Browse secondhand finds with photos of the actual item and a clear account of its condition.</p>
          ${available.length ? '<a class="button hero-button" href="#collection">See what’s available</a>' : ""}
        </div>
        <img class="hero-art" src="${assets}workshop.svg" alt="" width="530" height="440">
      </section>
      <section class="collection" id="collection" aria-labelledby="collection-heading">
        <h2 id="collection-heading">Available finds</h2>
        ${available.length ? grid(available, true) :
          `<div class="empty"><p>${catalog.items.length ? "There are no items available right now." :
            "The first listings are being prepared."}</p></div>`}
      </section>`,
    });
  }
  if (path === shopArchive) {
    const sold = catalog.items.filter(item => item.status === "sold");
    return shell({ path, title: "Sold archive · " + shopName, indexable,
      description: "Past finds sold through Kahlua’s Trading Post.",
      content: `<section class="collection">
        <h1>Sold archive</h1>
        ${sold.length ? grid(sold) : '<div class="empty"><p>No sold items have been added to the archive.</p></div>'}
      </section>`,
    });
  }
  const item = catalog.items.find(entry => itemPath(entry) === path);
  if (!item) throw new Error("Unknown Trading Post page");
  return shell({ path, title: item.name + " · " + shopName, description: item.wear, indexable,
    content: `<nav class="back" aria-label="Item trail"><a href="${item.market ? shopHome : shopArchive}">← ${item.market ? "Available finds" : "Sold archive"}</a></nav>
    <article class="detail">
      <div class="gallery">${item.photos.map((photo, index) => photoMarkup(photo, "detail-photo", index === 0)).join("")}</div>
      <div class="detail-copy">
        <p class="meta">${escape(item.category)} · ${item.sku}</p>
        <h1>${escape(item.name)}</h1>
        <p class="price">${item.market ? formatPrice(item.priceCents) : "Sold"}</p>
        ${item.market ? `<a class="button" rel="noreferrer" href="${item.market.href}">View on ${item.market.name}<span aria-hidden="true"> ↗</span></a>
        <p class="market-note">Check the marketplace listing for current availability, shipping, and returns.</p>` : ""}
        <dl>
          <dt>Condition · ${item.condition}</dt><dd>${escape(item.wear)}</dd>
          <dt>Testing</dt><dd>${escape(item.tested)}</dd>
          <dt>What’s included</dt><dd>${escape(item.included)}</dd>
        </dl>
      </div>
    </article>`,
  });
}
