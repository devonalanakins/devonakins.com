/** Opt-in presentation layer. No new routes, personal data, requests or runtime AI. */
const markPath = 'M8 7H20V15H28V7H36V15H44V7H56V24L47 31V39H41V45H47V51H55V59H9V51H17V31L8 24Z';
const mark = '<svg class="rook-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path fill="currentColor" d="'+markPath+'"/></svg>';
const feature = '<section class="rook-feature" aria-labelledby="rook-feature-title"><div class="rook-feature-plate">'+mark+'<span>01 / INSPECTABLE SOURCE</span></div><div class="rook-feature-copy"><p class="rook-label">FROM THE WORKBENCH · UNDER DEVELOPMENT</p><h2 id="rook-feature-title">Merit</h2><p>Devon built a Node.js CLI with contract and receipt validation and a read-only GitHub evidence inspector. It helps reviewers distinguish evidence from an unsupported claim.</p><p class="rook-feature-state">Open source; not a production certification or completed release.</p><div class="rook-links"><a href="/work/merit/">Read the case study</a><a href="https://github.com/devonalanakins/merit">Inspect the source</a></div></div></section>';
export function decorateCalRook(html, route) {
  if (typeof html !== 'string' || !html.includes('</head>')) throw new TypeError('Expected an existing generated HTML page');
  let result = html.replace('<html lang="en" class="', '<html lang="en" data-cal-rook class="')
    .replace('</head>', '<link rel="stylesheet" href="/src/professional/cal-rook.css"></head>')
    .replace('href="/favicon.svg"', 'href="/cal-rook/favicon.svg"')
    .replace('<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">','')
    .replace('<span>da.</span><strong>Devon Alan Akins</strong>', mark+'<strong>Devon Alan Akins</strong>');
  // The laboratory renders its navigable home panel on multiple pages; modify that
  // panel wherever it occurs so a client-side transition matches a direct visit.
  result = result.replace(/<section class="lab-portfolio-hero"[^>]*>[\s\S]*?<\/section>/, hero => {
    return hero
      .replace('INDEPENDENT SOFTWARE DEVELOPER · WRITER', 'INDEPENDENT SOFTWARE DEVELOPER · RESEARCH ENGINEER')
      .replace('Devon<br>Alan Akins<span>.</span>', 'Devon Alan Akins')
      .replace('I build software. I tell stories. I ask questions.', 'Scientific computing, computational modeling &amp; AI infrastructure.')
      .replace('Explore the work', 'See what I’ve built')
      .replace('<a class="lab-action" href="/watch/">', '<a class="lab-action" href="/fieldnotes/" data-one-go="writing">Read the field notes <span aria-hidden="true">→</span></a><a class="rook-watch" href="/watch/">')
      .replace(/<\/div><\/section>$/, '</div><figure class="rook-guide"><div class="rook-portrait"><img src="/cal-rook/portrait.svg" width="224" height="224" alt="Illustrated fictional workshop guide in a forest-green chore jacket, with a pencil behind his ear."><span class="rook-tape">LISTEN FIRST</span></div><figcaption><strong>Cal Rook · fictional AI workshop guide</strong><span>Rook: “Take what’s useful. Leave the rest.”</span></figcaption></figure></section>') + feature;
  });
  if (route === '/about/') result = result.replace('</main>', '<aside class="rook-about pc-wrap"><p><strong>About Cal Rook.</strong> Cal Rook is my fictional workshop guide, created to make my work approachable; I am the author and accountable owner of this site, and Cal is not a chatbot or a separate person.</p></aside></main>');
  if (route === '/contact/') result = result.replace('</main>', '<aside class="rook-contact"><p>Contact Devon Alan Akins directly. Cal Rook is fictional and does not receive or reply to messages.</p></aside></main>');
  if (result === html || !result.includes('data-cal-rook')) throw new Error('Cal Rook shell hook did not match');
  return result;
}
