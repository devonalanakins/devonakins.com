/**
 * Public creator resources. Treat every commercial link as an external
 * publication decision, not as an automatically available referral perk.
 * Written permission and account/payee ownership must be checked OUTSIDE code
 * before setting any promotion fields to approved.
 */
export const CREATOR_RESOURCES = Object.freeze([
  Object.freeze({
    id: "mercury",
    name: "Mercury",
    category: "Business operations",
    note: "One of the business-finance tools I use and genuinely appreciate. I share my own experience, not a promise that it is the right fit for every company.",
    officialUrl: "https://mercury.com/",
    allowedHosts: Object.freeze(["mercury.com", "www.mercury.com", "app.mercury.com"]),
    promotion: null, // Customer referral: public promotion needs Mercury's written permission.
  }),
]);

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g,
  character => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[character]));

function safeProviderUrl(value, allowedHosts) {
  if (typeof value !== "string" || !Array.isArray(allowedHosts)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password ||
        (url.port && url.port !== "443") || !allowedHosts.includes(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * A public commercial link only appears after recorded manual checks.
 * This is a render-time safety gate, NOT proof that the provider consented.
 */
export function approvedCommercialDestination(resource) {
  const promotion = resource?.promotion;
  if (!promotion || promotion.providerWrittenApproval !== true ||
      promotion.publisherApproved !== true ||
      promotion.beneficiaryVerified !== true ||
      promotion.approvalBasis !== "provider-written" ||
      !Array.isArray(promotion.approvedChannels) ||
      !promotion.approvedChannels.includes("website") ||
      typeof promotion.disclosure !== "string" ||
      promotion.disclosure.trim().length < 20) return null;

  const href = safeProviderUrl(promotion.href, resource.allowedHosts);
  return href ? {href, disclosure: promotion.disclosure.trim()} : null;
}

export function renderCreatorResources(resources = CREATOR_RESOURCES) {
  const cards = resources.map(resource => {
    const official = safeProviderUrl(resource.officialUrl, resource.allowedHosts);
    if (!official) throw new TypeError("Invalid creator resource official URL");

    const commercial = approvedCommercialDestination(resource);
    const url = commercial?.href ?? official;
    const disclosure = commercial
      ? '<p class="pc-resource-disclosure">' + escapeHtml(commercial.disclosure) + '</p>'
      : '<p class="pc-resource-state">No referral or affiliate link is active for this resource.</p>';
    const actionText = commercial ? "View referral offer" : "Visit official site";
    return '<article class="pc-resource" data-resource-id="' + escapeHtml(resource.id) + '"' +
      ' data-resource-link="' + (commercial ? "approved-commercial" : "editorial") + '">' +
      '<p class="pc-product-spec">' + escapeHtml(resource.category) + '</p>' +
      '<h3>' + escapeHtml(resource.name) + '</h3><p>' + escapeHtml(resource.note) + '</p>' +
      disclosure +
      '<p><a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer' +
      (commercial ? ' sponsored' : '') + '">' + actionText + ' <span aria-hidden="true">→</span></a></p>' +
      '</article>';
  }).join("");

  const footer = resources.some(resource => approvedCommercialDestination(resource))
    ? 'Approved compensated links are disclosed next to each recommendation. Stream promotion also requires permission for that channel.'
    : 'No commercial referral links are active. A stream QR can point to this page once this section is published.';

  return '<section class="pc-section pc-two-column" id="resources" aria-labelledby="pc-resources-title">' +
    '<div><p class="pc-eyebrow">Real tools / transparent links</p>' +
    '<h2 id="pc-resources-title">Tools I actually use</h2>' +
    '<p>Real working tools, in context. I will mark any compensated recommendations beside their links if they are approved.</p>' +
    '</div><div class="pc-prose">' + cards +
    '<p class="pc-resource-note">' + footer + '</p>' +
    '</div></section>';
}
