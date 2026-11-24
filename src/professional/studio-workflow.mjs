// Public-facing studio workflow only. No household, collaborator, network, or
// provider configuration belongs here; statuses are not operational telemetry.
export const STUDIO_STAGES = Object.freeze([
  Object.freeze({
    number: '01', title: 'Capture', state: 'Current kit',
    summary: 'Local laptop screen capture and voice, with iPhone recording as another option.',
    detail: 'Real microphone routing and broadcast quality still need device-level verification.'
  }),
  Object.freeze({
    number: '02', title: 'Produce', state: 'Workflow in design',
    summary: 'Laptop editing and production are the first workflow to test; mobile production can follow.',
    detail: 'Editing and audio routing have not been independently tested.'
  }),
  Object.freeze({
    number: '03', title: 'Broadcast', state: 'Check Live',
    summary: 'When a verified public stream is on air, it will play on this website.',
    detail: 'A real laptop-to-player test and approved publication configuration are required.'
  }),
  Object.freeze({
    number: '04', title: 'Publish', state: 'Review required',
    summary: 'Useful recordings can become Watch videos, podcast episodes, or lessons.',
    detail: 'Every public recording needs an explicit approval, privacy review and accessible captions.'
  })
]);

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));

export function renderStudioWorkflow() {
  const stages = STUDIO_STAGES.map(stage =>
    '<li class="pc-studio-step">' +
    '<div class="pc-studio-step-top"><span class="pc-studio-number">' + escapeHtml(stage.number) +
    '</span><span class="pc-studio-status">' + escapeHtml(stage.state) + '</span></div>' +
    '<h3>' + escapeHtml(stage.title) + '</h3>' +
    '<p>' + escapeHtml(stage.summary) + '</p>' +
    '<small>' + escapeHtml(stage.detail) + '</small></li>'
  ).join('');
  return [
    '<section class="pc-section pc-studio-map" id="studio" aria-labelledby="pc-studio-title">',
    '<div class="pc-studio-heading"><div><p class="pc-eyebrow">The evolving workspace</p>',
    '<h2 id="pc-studio-title">From the studio to your screen.</h2></div>',
    '<p>One personal studio for exploring ideas, building software and sharing what I learn. The process is deliberately simple, and each step is labeled by what is actually ready.</p></div>',
    '<ol class="pc-studio-flow" aria-label="Studio production workflow">', stages, '</ol>',
    '<div class="pc-studio-footer"><p>My longer-term goal is more independent, self-hostable infrastructure. There is no public home server or automatic replay system connected to this site.</p>',
    '<div class="pc-studio-links"><a href="/live/">Visit Live <span aria-hidden="true">→</span></a>',
    '<a href="/watch/">Explore Watch <span aria-hidden="true">→</span></a></div></div>',
    '</section>'
  ].join('');
}
