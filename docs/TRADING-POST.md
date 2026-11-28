# Kahlua’s Trading Post

The first release is a catalog at `/shop/`. Each available item links to one
seller-approved marketplace listing. The marketplace owns availability,
payment, shipping, and returns. Keep the website’s listing and archive current
as items sell.

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
4. Share only approved item descriptions, prices, public listing links, and
   selected photo copies for the website update. Keep costs, buyer information,
   pickup address, and the private workbook out of the repository.

- [Import a workbook in Numbers on iPhone](https://support.apple.com/guide/numbers-iphone/tan9f3c54bdc/ios)
- [Share photos without location data](https://support.apple.com/guide/iphone/share-photos-and-videos-iphf28f17237/ios)

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
| `sku` / `slug` | Stable ID such as `KT-0001` and lowercase URL slug |
| `name` / `category` | Item name and a shop department |
| `condition` / `wear` | Condition label and specific wear or defects |
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
