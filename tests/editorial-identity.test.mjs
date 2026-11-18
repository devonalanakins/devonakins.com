import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {renderResearchFacilityHome} from '../src/professional/research-facility.mjs';

test('Laboratory share metadata uses its actual editorial social image', () => {
  const html=renderResearchFacilityHome();
  assert.match(html,/<meta property="og:image" content="https:\/\/devonakins\.com\/social-card\.jpg">/);
  assert.match(html,/property="og:image:width" content="1200"/);
  assert.match(html,/property="og:image:height" content="630"/);
  assert.match(html,/name="twitter:card" content="summary_large_image"/);
  assert.match(html,/name="twitter:image" content="https:\/\/devonakins\.com\/social-card\.jpg"/);
  assert.match(html,/rel="apple-touch-icon" href="\/apple-touch-icon\.png"/);
  assert.match(html,/rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html,/rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/);
  assert.doesNotMatch(html,/(?:patient|referral)[ -]?(?:data|record)(?:s)?=["']/i);
});

test('generated share card and icons retain the deployed ivory, ink and blue identity', async () => {
  const [manifest,svg,generator,pages]=await Promise.all([
    readFile('public/manifest.webmanifest','utf8'),
    readFile('public/social-card.svg','utf8'),
    readFile('scripts/assets.mjs','utf8'),
    readFile('scripts/pages.mjs','utf8')
  ]);
  const m=JSON.parse(manifest);
  assert.equal(m.background_color,'#f3f1e9');
  assert.equal(m.theme_color,'#f3f1e9');
  assert.match(svg,/#f3f1e9/i);
  assert.match(svg,/#2948d3/i);
  assert.match(svg,/#1c2425/i);
  assert.match(svg,/data:image\/jpeg;base64,/);
  assert.match(svg,/Alan Akins/);
  assert.match(generator,/public\/professional\/devon-portrait\.avif/);
  assert.match(pages,/import "\.\/assets\.mjs";/);
  const social=await sharp('public/social-card.jpg').metadata();
  assert.equal(social.width,1200);
  assert.equal(social.height,630);
  assert.equal(social.format,'jpeg');
  const icon=await sharp('public/icon-512.png').metadata();
  assert.equal(icon.width,512);
  assert.equal(icon.height,512);
  assert.equal(icon.format,'png');
  const favicon=await readFile('public/favicon.svg','utf8');
  assert.match(favicon,/>da\.<\/text>/);
  assert.match(favicon,/#2948d3/);
});
