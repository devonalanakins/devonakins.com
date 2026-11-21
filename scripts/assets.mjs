import { writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
import { markSVG } from "../src/identity.mjs";
await mkdir("public", { recursive: true });
await writeFile("public/brand-mark.svg", markSVG());
await writeFile("public/brand-mark-mono.svg", markSVG({ mono: true }));
// Match the actual Laboratory site's editorial palette and lowercase 'da.' branding.
const paper='#f3f1e9', ink='#1c2425', blue='#2948d3', muted='#53605e', rule='#c9cdc5';
// Square icon background: browsers and operating systems apply their own mask.
// Safe central placement also works for the PWA maskable icon.
const icon=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Devon Akins da. monogram"><rect width="512" height="512" fill="${blue}"/><text x="250" y="329" text-anchor="middle" fill="${paper}" font-family="Arial,Helvetica,sans-serif" font-size="247" font-weight="800" letter-spacing="-16">da.</text></svg>`;
await writeFile('public/favicon.svg',icon);
for(const [name,size] of [['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180],['favicon-32.png',32],['da-icon-1024.png',1024],['icon-maskable-512.png',512]]){
  await sharp(Buffer.from(icon)).resize(size,size).png().toFile('public/'+name);
}
// Use the already-published, owner-approved homepage portrait, not a synthetic face.
// Package the image directly in the SVG; the social preview has no remote image dependency.
const portrait=await sharp('public/professional/devon-portrait.avif')
  .resize(298,397,{fit:'cover',position:'centre'})
  .jpeg({quality:87,mozjpeg:true}).toBuffer();
const photo='data:image/jpeg;base64,'+portrait.toString('base64');
const social=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${paper}"/>
<path d="M70 118H1130M70 564H1130" stroke="${rule}" stroke-width="1"/>
<text x="70" y="92" fill="${blue}" font-family="Arial,Helvetica,sans-serif" font-size="59" font-weight="800" letter-spacing="-6">da.</text>
<text x="1130" y="84" text-anchor="end" fill="${muted}" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="12" letter-spacing="2.3">DEVONAKINS.COM</text>
<text x="70" y="174" fill="${muted}" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700" letter-spacing="1.25">INDEPENDENT SOFTWARE DEVELOPER</text>
<text x="70" y="200" fill="${muted}" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700" letter-spacing="1.25">WRITING &amp; RESEARCH</text>
<text x="63" y="339" fill="${ink}" font-family="Arial,Helvetica,sans-serif" font-size="117" font-weight="800" letter-spacing="-9">Devon</text>
<text x="63" y="453" fill="${ink}" font-family="Arial,Helvetica,sans-serif" font-size="108" font-weight="800" letter-spacing="-8">Alan Akins<tspan fill="${blue}">.</tspan></text>
<text x="70" y="516" fill="${ink}" font-family="Arial,Helvetica,sans-serif" font-size="25">Software. Writing. Research.</text>
<text x="70" y="597" fill="${muted}" font-family="Arial,Helvetica,sans-serif" font-size="12" font-weight="700" letter-spacing="1.5">PERSONAL / INDEPENDENT</text>
<text x="1130" y="597" text-anchor="end" fill="${blue}" font-family="Arial,Helvetica,sans-serif" font-size="12" font-weight="700" letter-spacing="1.2">HOME / WORK / RESEARCH</text>
<rect x="822" y="145" width="321" height="401" fill="#dadfd9"/>
<image x="834" y="147" width="298" height="397" href="${photo}"/>
</svg>`;
await writeFile('public/social-card.svg',social);
await sharp(Buffer.from(social)).jpeg({quality:91,mozjpeg:true}).toFile('public/social-card.jpg');
await sharp(Buffer.from(social)).resize(2400,1260).png().toFile('public/da-social-2400.png');
await writeFile(
  "public/manifest.webmanifest",
  JSON.stringify(
    {
      id: "/",
      name: "Devon Alan Akins",
      short_name: "Devon",
      description: "Independent software developer, writer, and systems researcher.",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: paper,
      theme_color: paper,
      icons: [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    null,
    2,
  ),
);
await writeFile(
  "public/robots.txt",
  "User-agent: *\nAllow: /\n\nSitemap: https://devonakins.com/sitemap.xml\n",
);
console.log(
  "Created editorial identity, portrait share card, raster icon family and manifest.",
);
