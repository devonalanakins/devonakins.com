import test from "node:test";
import assert from "node:assert/strict";
import {CREATOR_RESOURCES, approvedCommercialDestination, renderCreatorResources} from "../src/professional/creator-resources.mjs";
import {CREATOR_ROUTES, renderCreatorPage} from "../src/professional/creator-pages.mjs";

const mercury = CREATOR_RESOURCES.find(resource => resource.id === "mercury");

test("tools I use is a first-party setup section with editorial-only Mercury", () => {
  assert.ok(mercury);
  assert.equal(mercury.promotion, null);
  assert.equal(approvedCommercialDestination(mercury), null);
  const html = renderCreatorPage(CREATOR_ROUTES.setup);
  assert.match(html, /href="#resources">Tools I use/);
  assert.match(html, /id="resources" aria-labelledby="pc-resources-title"/);
  assert.match(html, /Tools I actually use/);
  assert.match(html, /data-resource-id="mercury" data-resource-link="editorial"/);
  assert.match(html, /href="https:\/\/mercury\.com\/" target="_blank" rel="noopener noreferrer">Visit official site/);
  assert.match(html, /No referral or affiliate link is active/);
  assert.doesNotMatch(html, /data-resource-link="approved-commercial"|rel="noopener noreferrer sponsored"|View referral offer/);
  assert.doesNotMatch(html, /referral_token|ref_code|mercury\.com\/r\//);
});

test("commercial links require written provider permission, owner review, channel and obvious disclosure", () => {
  const approved = {
    ...mercury,
    promotion: {
      providerWrittenApproval: true,
      publisherApproved: true,
      beneficiaryVerified: true,
      approvalBasis: "provider-written",
      approvedChannels: ["website", "livestream"],
      href: "https://mercury.com/r/example-test-only",
      disclosure: "I may receive a referral bonus if you qualify."
    }
  };
  assert.equal(approvedCommercialDestination(approved).href, "https://mercury.com/r/example-test-only");
  const html = renderCreatorResources([approved]);
  assert.match(html, /data-resource-link="approved-commercial"/);
  assert.match(html, /I may receive a referral bonus if you qualify/);
  assert.match(html, /rel="noopener noreferrer sponsored"/);
  assert.match(html, /View referral offer/);
  assert.doesNotMatch(html, /No referral or affiliate link is active for this resource/);

  const changes = [
    {providerWrittenApproval: false},
    {publisherApproved: false},
    {beneficiaryVerified: false},
    {approvalBasis: "customer-referral-terms-only"},
    {approvedChannels: ["private-direct"]},
    {disclosure: ""},
    {disclosure: "Referral"},
    {href: "https://mercury.com.evil.example/affiliate"},
    {href: "https://mercury.com@attacker.example/r/example"},
    {href: "http://mercury.com/r/example"},
    {href: "javascript:alert(1)"},
    {href: "https://user:password@mercury.com/r/example"}
  ];
  for (const change of changes) {
    const rejected = {...approved, promotion: {...approved.promotion, ...change}};
    assert.equal(approvedCommercialDestination(rejected), null, JSON.stringify(change));
    const hidden = renderCreatorResources([rejected]);
    assert.match(hidden, /data-resource-link="editorial"/);
    assert.doesNotMatch(hidden, /View referral offer|rel="noopener noreferrer sponsored"/);
  }
});

test("creator resource copy and URLs are escaped and provider domains are allowlisted", () => {
  const injection = {...mercury, id: 'bad" onclick="x', name: "<script>x</script>",
    note: "<img src=x>", category: "<b>untrusted</b>"};
  const html = renderCreatorResources([injection]);
  assert.doesNotMatch(html, /<script>x|<img src=x>|<b>untrusted<\/b>|onclick="x"/);
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
  assert.throws(() => renderCreatorResources([{...mercury, officialUrl: "https://fake.example/"}]), /Invalid creator resource official URL/);
});
