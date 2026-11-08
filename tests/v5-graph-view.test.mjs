import test from "node:test";
import assert from "node:assert/strict";
import {
  selectPublicGraphDate, renderPublicGraphHistory,
} from "../src/v5/public-graph-view.mjs";
import { renderV5Preview } from "../src/v5/shell.mjs";

const stamp = "2026-11-07T20:00:00.000Z";
const now = Date.parse(stamp);
const proof = "https://github.com/devonalanakins/mizvo/pull/9";
const review = "https://github.com/devonalanakins/devonakins.com/pull/70";
const entry = (sequence, effectiveAt, action, value) => ({
  schema: 1, sequence, effectiveAt, action, value, reviewUrl: review, evidenceUrl: proof,
});
const feature = { id: "feature:mizvo/review", type: "feature", label: "Review", parent: "project:mizvo" };
const component = { id: "component:mizvo/rooms", type: "component", label: "Rooms", parent: "project:mizvo" };
const relation = {
  id: "relation:review-rooms", type: "implements",
  from: "feature:mizvo/review", to: "component:mizvo/rooms",
};
const approved = [
  entry(1, "2026-11-04T12:00:00.000Z", "publish-node", feature),
  entry(2, "2026-11-07T13:00:00.000Z", "publish-node", component),
  entry(3, "2026-11-07T14:00:00.000Z", "publish-relation", relation),
];
const count = (text, token) => text.split(token).length - 1;

test("date chooser uses UTC day boundaries, current-day ceiling and no future date", () => {
  assert.deepEqual(selectPublicGraphDate(undefined, now), {
    selected: "2026-11-07", maxDate: "2026-11-07", at: now, invalid: false,
  });
  assert.deepEqual(selectPublicGraphDate("2026-11-04", now), {
    selected: "2026-11-04", maxDate: "2026-11-07",
    at: Date.parse("2026-11-04T23:59:59.999Z"), invalid: false,
  });
  assert.equal(selectPublicGraphDate("2026-11-07", now).at, now);
  for (const candidate of ["2026-11-08", "2026-11-99", "2026-02-30",
    "2026-1-01", "<img src=x>", "2026-11-07%00", "9999-12-31", []]) {
    const result = selectPublicGraphDate(candidate, now);
    assert.equal(result.invalid, true, String(candidate));
    assert.equal(result.selected, "2026-11-07");
    assert.equal(result.at, now);
  }
});

test("owner-approved archive shows source-backed publications but no active-product claims", () => {
  const html = renderPublicGraphHistory({ now });
  assert.match(html, /data-v5-graph-revision="8"/);
  assert.match(html, /data-v5-graph-version="1"/);
  assert.equal(count(html, 'class="v5-graph-node"'), 12);
  assert.match(html, /Squelch portfolio source/);
  assert.match(html, /Mizvo portfolio source/);
  assert.match(html, /Review #8/);
  assert.match(html, />documents<\/span>/);
  assert.match(html, /Approved directory entry; no connection or historical launch is implied/);
  assert.match(html, /action="\/__v5_preview__\/field\/"/);
  assert.match(html, /method="get"/);
  assert.match(html, /name="asOf" type="date"/);
  assert.match(html, /max="2026-11-07"/);
  assert.match(html, /href="\/work\/mizvo\/"/);
  assert.match(html, /href="\/__v5_preview__\/knowledge\/"/);
  assert.doesNotMatch(html, /<canvas|fetch\(|setInterval|private-client|SECRET/i);
});

test("reviewed structural records show only milestones effective by the selected UTC day", () => {
  const past = renderPublicGraphHistory({ records: approved, now, requestedDate: "2026-11-04" });
  assert.match(past, /data-v5-graph-revision="1"/);
  assert.equal(count(past, 'class="v5-graph-node"'), 9);
  assert.match(past, />Review<\/h3>/);
  assert.doesNotMatch(past, /<h3>Rooms<\/h3>/);
  assert.match(past, /No verified public relationships have been published/);
  const current = renderPublicGraphHistory({ records: approved, now });
  assert.match(current, /data-v5-graph-revision="3"/);
  assert.equal(count(current, 'class="v5-graph-node"'), 10);
  assert.match(current, /<h3>Rooms<\/h3>/);
  assert.match(current, /<h3>Review<\/h3>/);
  assert.match(current, />implements<\/span>/);
  assert.match(current, /Publication review/);
  assert.match(current, /Source evidence/);
  assert.equal(count(current, 'class="v5-graph-timeline"'), 1);
  assert.match(current, /Review #3/);
});

test("invalid or hostile manifest cannot leak components or relationships in rendered HTML", () => {
  const invalid = [
    entry(1, "2026-11-04T12:00:00.000Z", "publish-node", {
      ...feature, label: "<script>PRIVATE_CLIENT</script>",
    }),
  ];
  const html = renderPublicGraphHistory({ records: invalid, now });
  assert.match(html, /Structural changes are hidden/);
  assert.equal(count(html, 'class="v5-graph-node"'), 8);
  assert.doesNotMatch(html, /<script>|PRIVATE_CLIENT|Source evidence/);
  assert.match(html, /data-v5-graph-revision="0"/);
});

test("future and invalid requested dates do not echo arbitrary query input", () => {
  for (const requestedDate of ["2026-12-02", "<svg onload=alert(1)>"]) {
    const html = renderPublicGraphHistory({ requestedDate, now });
    assert.match(html, /Choose a valid UTC date/);
    assert.match(html, /value="2026-11-07"/);
    assert.doesNotMatch(html, /onload=|2026-12-02/);
  }
});

test("Signal Field preview embeds the semantic dated timeline without modifying screenshot home", () => {
  const field = renderV5Preview("field", { asOf: "2026-11-04", now });
  assert.match(field, /Public systems atlas/);
  assert.match(field, /Structure as of \(UTC\)/);
  assert.match(field, /value="2026-11-04"/);
  assert.match(field, /noindex,nofollow,noarchive/);
  assert.equal(count(field, 'class="v5-graph-node"'), 11);
  assert.doesNotMatch(field, /\/api\/activity\/v4|THREADS_USER_ACCESS_TOKEN/);
  const home = renderV5Preview("home", { asOf: "2026-11-04", now });
  assert.doesNotMatch(home, /v5-graph-date|Public systems atlas/);
  assert.match(home, /data-v5-exact-reference="2026-11-07"/);
});
