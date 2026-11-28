# Kahlua’s Trading Post

The first release is a catalog at `/shop/`. Each available item links to one
seller-approved marketplace listing. Buyers follow the listing’s availability,
payment, shipping, and return terms. Update the catalog as items sell.

## Prepare the opening batch on iPhone

1. Photograph each item in Camera. In Photos, capture the whole item, the
   manufacturer label, accessories, and any wear. Crop out addresses, family
   photos, reflections, and other identifying details. When sharing files,
   use Photos → Share → Options and turn off Location. Use Most Compatible for
   JPEG copies when needed. Keep original photos in Photos.
2. Save the launch workbook in Files and open it in Numbers. Use the Items
   sheet for IDs, ownership and recall checks, condition, comparables, costs,
   packed dimensions, and live listing URLs. Keep this workbook private in
   iCloud Drive. Use Notes for draft copy if convenient.
3. After seller verification and approval, use Safari to publish one
   listing per item on the chosen marketplace. Check the public item URL from
   a private browsing tab. Confirm the price, photos, and fulfillment terms.
4. Add approved item details to the [public catalog template](trading-post-items.csv)
   in Numbers. Use one line per photo in the Photo descriptions cell, in photo
   order. Keep costs, buyer information, pickup addresses, and the private
   workbook in iCloud Drive.
5. Export the single public table as CSV in Numbers. In Files, name the selected
   JPEG or PNG photo copies by SKU and photo number, such as `KT-0001-1.jpg`
   for the main photo. Share the CSV and photos for the website update.

- [Import a workbook in Numbers on iPhone](https://support.apple.com/guide/numbers-iphone/tan9f3c54bdc/ios)
- [Export CSV from Numbers on iPhone](https://support.apple.com/guide/numbers-iphone/export-to-excel-or-another-file-format-tan3b922d4ad/ios)
- [Share photos without location data](https://support.apple.com/guide/iphone/share-photos-and-videos-iphf28f17237/ios)

## Prepare a catalog update

```sh
node scripts/prepare-trading-post-batch.mjs /path/to/public-items.csv /path/to/photos /path/to/new-batch
```

The batch contains `inventory.json` and prepared JPEGs in `photos/`. It uses
the storefront’s inventory and photo validation, removes tracking parameters
from listing URLs, and leaves publication off. Review the images and confirm
each public listing URL and price in Safari. For the first release, copy the
reviewed manifest and photos into `src/trading-post/`. For later batches, merge
updates by SKU into the current manifest and review any archive changes.

## Review and release

```sh
npm ci
TRADING_POST_PREVIEW=1 npm run build
npm run preview
```

Open `/shop/` in the local preview. Preview pages are omitted from the sitemap
and marked noindex. Treat hosted previews as readable by anyone with access to
the server.

Prepare each approved photo with the existing image library. Use `slug-1.jpg`
for the main image. The command reorients and resizes the image and writes a
JPEG without the original metadata. Review its visible content before commit.

```sh
node scripts/prepare-shop-photo.mjs /path/to/photo.jpg item-slug-1.jpg
```

In `src/trading-post/inventory.json`, each item has:

| Field | Value |
| --- | --- |
| `sku` / `slug` | Stable ID such as `KT-0001` and a lowercase, hyphenated URL name |
| `name` / `category` | Item name and Arcade, Library, Workshop, Tech Vault, Curiosities, Garden, or Clothing & Shoes |
| `condition` / `wear` | Like new, Very good, Good, Fair, or For parts, plus specific wear or defects |
| `tested` / `included` | Actual testing or an explicit untested state, and what comes with it |
| `priceCents` | Whole cents in US dollars, matching the public listing |
| `status` | `available` or `sold` |
| `listingUrl` | The direct eBay or Facebook Marketplace item URL for an available item. Remove the link from sold items. |
| `photos` | Array of `{ "file": "item-slug-1.jpg", "alt": "Specific view of the item" }` objects |

Commit public-ready records and photos only. The normal build includes the
shop once the manifest has `published: true` and passes validation. The site’s
manual deployment workflow covers the approved release. Run `npm run build`
and `npm test`, then open the released listing pages on iPhone before sharing
the shop link. Set a sold item’s status to `sold` and remove its marketplace link
to move it into the archive. To unpublish the entire shop, set `published` to
`false` and redeploy through the same workflow.
