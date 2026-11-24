/**
 * Public personal biography. No private assistant material, clinical records,
 * inferred membership, or unsupported product-release claims.
 */
export const PERSONAL_ABOUT_ROUTE = "/about/";

export function renderPersonalAbout() {
  return [
    '<article class="pc-wrap pc-about" aria-labelledby="pc-title">',
    '<header class="pc-about-hero"><p class="pc-eyebrow">About / Devon Alan Akins</p>',
    '<h1 id="pc-title">The person behind <em>the work.</em></h1>',
    '<p class="pc-about-lede">I build software, write, ask questions and teach what I learn. AI helps me explore faster; I am responsible for what ships.</p>',
    '<p class="pc-about-intro">I’m Devon Alan Akins: an independent software developer, writer, interviewer and lifelong student. I am also a father. The work changes shape, but I keep coming back to the same idea: learn something useful, make it work, and share what it taught you.</p>',
    '<div class="pc-about-actions"><a class="pc-button pc-button-primary" href="/work/">Explore the work <span aria-hidden="true">→</span></a><a class="pc-button" href="/contact/">Get in touch <span aria-hidden="true">→</span></a></div></header>',
    '<div class="pc-about-grid">',
    '<section aria-labelledby="pc-about-build"><p class="pc-eyebrow">01 / Software</p><h2 id="pc-about-build">Build for people.</h2>',
    '<p>I design and develop independent applications and systems. I care about source control, genuine usability, maintainable architecture, accessibility, security and the difference between a working release and an interesting prototype.</p>',
    '<p>My public <a href="/work/">Work</a> pages distinguish shipped software, source-only experiments and ideas that are still taking shape. Apple-platform development is part of that work; archived iOS source is not represented as a current App Store release or proof of Apple Developer Program membership.</p></section>',
    '<section aria-labelledby="pc-about-publish"><p class="pc-eyebrow">02 / Create</p><h2 id="pc-about-publish">Tell the story.</h2>',
    '<p>My podcast is named <a href="/podcast/">Devon Alan Akins</a>. I want it to be a place for long, unscripted conversations, with occasional episodes where I work through an idea on my own. Episodes will appear only after real recording, review and publication.</p>',
    '<p>The <a href="/watch/">Watch</a> library is the first-party home for approved video. My <a href="/fieldnotes/">Writing</a> includes technical notes, manuscripts and creative work, clearly labeled by publication status.</p></section>',
    '<section aria-labelledby="pc-about-teach"><p class="pc-eyebrow">03 / Learn</p><h2 id="pc-about-teach">Make knowledge useful.</h2>',
    '<p>In <a href="/courses/">Learn</a>, I am building practical lessons on household competence, tools, responsibility, scientific reasoning and working with AI. The free <a href="/courses/man-of-the-house/start/">home walk-through</a> is a complete written introduction, not a finished paid course.</p>',
    '<p>I study mathematics, physics, computing and human behavior because the underlying principles matter. A good explanation should leave someone more capable of judging whether a result makes sense.</p></section>',
    '<section aria-labelledby="pc-about-boundaries"><p class="pc-eyebrow">04 / Boundaries</p><h2 id="pc-about-boundaries">Keep projects honest.</h2>',
    '<p>Dadog is my developing private AI counterpart. A public example may be introduced when it is synthetic, safe and approved; this site does not expose private accounts, conversations or personal Knowledge.</p>',
    '<p>I also support nonclinical operations and technology at Nona Neuropsychology. That professional work is separate from my personal publishing, and clinical judgments remain with licensed professionals. ANEVUM is my independent creative universe and studio, not a substitute identity for this site.</p></section>',
    '</div>',
    '<section class="pc-about-principles" aria-labelledby="pc-about-ai-title"><div><p class="pc-eyebrow">AI-assisted software development</p><h2 id="pc-about-ai-title">Vibe coding, without skipping the engineering.</h2>',
    '<p class="pc-about-intro">I use AI to explore an idea, prototype and iterate. Then I read the changes, test the behavior and document what actually works. Vibe coding is a way to explore, not a substitute for software engineering or evidence of a deployed product. I document selected work sessions, not private life or confidential work. See <a href="/setup/">how the studio works</a>.</p></div>',
    '<ol><li><strong>Start with a real problem.</strong><span>Explain the audience, constraints and a useful outcome before asking AI for code.</span></li>',
    '<li><strong>Verify the result.</strong><span>Review the changes, test failure cases, check accessibility and security, and distinguish experiments from releases.</span></li>',
    '<li><strong>Teach from evidence.</strong><span>Turn approved demonstrations into clear lessons and short videos after privacy, accuracy and rights review.</span></li></ol></section>',
    '<section class="pc-about-principles" aria-labelledby="pc-about-principles-title"><div><p class="pc-eyebrow">How I work</p><h2 id="pc-about-principles-title">A few principles.</h2></div>',
    '<ol><li><strong>Make the purpose obvious.</strong><span>A visitor should know why something exists without a tour.</span></li>',
    '<li><strong>Show the evidence.</strong><span>A pull request is not a production deployment, and a passing test is not a customer outcome.</span></li>',
    '<li><strong>Protect the private.</strong><span>Personal, family and professional data do not belong in a public showcase.</span></li>',
    '<li><strong>Finish what matters.</strong><span>Good projects survive imperfect days because they are designed around real life.</span></li></ol></section>',
    '<section class="pc-about-contact" aria-labelledby="pc-about-contact-title"><div><p class="pc-eyebrow">Keep in touch</p><h2 id="pc-about-contact-title">Have a question or a story?</h2>',
    '<p>For independent software, writing, podcast conversations and nonclinical collaboration.</p></div>',
    '<div><a href="mailto:hello@devonakins.com">hello@devonakins.com <span aria-hidden="true">↗</span></a><p>Do not send medical records, private credentials or other sensitive material to this address.</p>',
    '<a href="https://github.com/devonalanakins" target="_blank" rel="noopener noreferrer">Verified public GitHub profile <span aria-hidden="true">↗</span></a></div></section>',
    '</article>'
  ].join("");
}
