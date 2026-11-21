/**
 * Public, self-contained introductory lesson. This is a real written learning
 * resource, not a purchased course, enrollment system or private progress API.
 * Keep it accessible without JavaScript and without account state.
 */
export const PRACTICAL_START_ROUTE = "/courses/man-of-the-house/start/";

export function renderPracticalStartLesson() {
  return [
    '<article class="pc-wrap pc-lesson" aria-labelledby="pc-title">',
    '<header class="pc-lesson-hero">',
    '<p class="pc-eyebrow"><a href="/courses/">Learn</a> / Man of the House / Free introduction</p>',
    '<p class="pc-lesson-status">Free written lesson · No account required</p>',
    '<h1 id="pc-title">Start with a <em>walk-through.</em></h1>',
    '<p class="pc-lesson-deck">Care for a home begins with noticing what needs attention, choosing what is safe to handle, and following through.</p>',
    '<p class="pc-lesson-note">Man of the House is a working course title about practical responsibility, not a claim that household competence belongs to one gender. Everyone who shares a home can practice it.</p>',
    '<dl class="pc-lesson-facts"><div><dt>Practice</dt><dd>15 minutes</dd></div><div><dt>Tools</dt><dd>Paper or phone notes; optional flashlight</dd></div><div><dt>Outcome</dt><dd>One safe improvement and a three-item action list</dd></div></dl>',
    '</header>',
    '<div class="pc-lesson-layout">',
    '<nav class="pc-lesson-toc" aria-label="Lesson sections"><strong>In this lesson</strong>',
    '<ol><li><a href="#lesson-goal">The goal</a></li><li><a href="#lesson-prepare">Get ready</a></li>',
    '<li><a href="#lesson-scan">Walk the space</a></li><li><a href="#lesson-sort">Sort what you found</a></li>',
    '<li><a href="#lesson-do">Do one safe thing</a></li><li><a href="#lesson-finish">Close the loop</a></li></ol></nav>',
    '<div class="pc-lesson-reading">',
    '<section id="lesson-goal"><p class="pc-lesson-index">01 / The goal</p><h2>Be responsible without guessing.</h2>',
    '<p>A reliable household is not one where nothing breaks. It is one where people notice problems, communicate clearly and act before small issues become bigger ones. You do not need specialized tools or a workshop to begin.</p>',
    '<p>By the end, you will have observed one room or area, made one low-risk improvement and written down three next actions with clear owners or dates. This is a practice, not an inspection certification.</p></section>',
    '<section id="lesson-prepare"><p class="pc-lesson-index">02 / Prepare</p><h2>Start small.</h2>',
    '<p>Choose one area: a kitchen, bathroom, hallway or entryway. Set aside 15 minutes. Bring a note or your phone, and use a flashlight only if you need to see an easily accessible area. Tell other people in the home what you are checking so nobody is surprised by an unfinished task.</p>',
    '<aside class="pc-lesson-safety" aria-label="Safety boundary"><strong>Know the boundary.</strong><p>Observe only. Do not open electrical panels, work near exposed wires, climb onto roofs, disturb gas lines, move heavy appliances or work on a suspected structural problem. For a gas smell, sparking equipment, active flooding or another immediate hazard, leave the unsafe area and contact the appropriate emergency service or qualified professional.</p></aside></section>',
    '<section id="lesson-scan"><p class="pc-lesson-index">03 / Observe</p><h2>Make three passes.</h2>',
    '<ol class="pc-lesson-steps"><li><strong>Safety:</strong> Look for tripping hazards, blocked exits, unstable objects and smoke or carbon-monoxide alarms that need routine testing according to their instructions.</li>',
    '<li><strong>Maintenance:</strong> Notice loose non-structural hardware, drips you can see without dismantling anything, moisture marks, sticking doors and damage that needs a closer professional look.</li>',
    '<li><strong>Daily life:</strong> Identify what makes the space harder to use: missing supplies, clutter, poor storage or a recurring chore no one has clearly taken responsibility for.</li></ol>',
    '<p>Write down observations instead of diagnosing causes. “Water mark beneath sink, seen Saturday” is useful. “Pipe behind wall is broken” would be a guess.</p></section>',
    '<section id="lesson-sort"><p class="pc-lesson-index">04 / Decide</p><h2>Sort by urgency and skill.</h2>',
    '<div class="pc-lesson-triage"><div><strong>Now / make safe</strong><p>Safety risks and active damage. Keep people clear and contact appropriate help; do not attempt unsafe work.</p></div>',
    '<div><strong>This week / handle</strong><p>Low-risk tasks you know how to do, or work that needs to be scheduled with a qualified provider.</p></div>',
    '<div><strong>Monitor / plan</strong><p>Small issues, maintenance reminders and ideas that are useful but not urgent.</p></div></div>',
    '<p>When you do not know how to do something safely, learning the limit of your skill is progress too.</p></section>',
    '<section id="lesson-do"><p class="pc-lesson-index">05 / Act</p><h2>Complete one small thing.</h2>',
    '<p>Choose a low-risk task: clear a trip hazard, organize frequently used supplies or clean an accessible surface. If you have the right manual screwdriver and a loose cabinet pull with a visible, reachable screw, tighten it gently and test the handle. Stop if it resists, is damaged or would require dismantling anything. Do not force a repair to make the list look complete.</p>',
    '<p>The goal is one finished, verifiable improvement, not a dramatic before-and-after photo.</p></section>',
    '<section id="lesson-finish"><p class="pc-lesson-index">06 / Follow through</p><h2>Leave a clear next step.</h2>',
    '<p>Record three items in a note you can find again. Use a simple pattern: <strong>what you noticed / who will handle it / when it gets checked</strong>. Share it with the people affected and agree on responsibilities rather than assigning work without discussion.</p>',
    '<div class="pc-lesson-example"><p class="pc-lesson-index">Worked example / bathroom</p>',
    '<ol><li><strong>Now:</strong> Move the bathmat that keeps sliding; replace or secure it safely today.</li>',
    '<li><strong>This week:</strong> Ask a qualified plumber about a recurring drip under the sink; send a short description and arrange a visit.</li>',
    '<li><strong>Monitor:</strong> Check that bathroom supplies are stocked at the next weekly household review.</li></ol></div>',
    '<p>Set one recurring weekly walk-through. The habit matters more than doing everything at once.</p></section>',
    '<section class="pc-lesson-complete" aria-labelledby="lesson-complete-title"><p class="pc-lesson-index">Finish line</p>',
    '<h2 id="lesson-complete-title">Your first lesson is complete when:</h2>',
    '<ul><li>You have observed one area without taking unsafe shortcuts.</li><li>You finished one low-risk improvement.</li>',
    '<li>You documented three next actions and discussed responsibility with anyone affected.</li></ul>',
    '<p>There is no account tracking or saved course progress here. Keep the list in your own notes. A wider course, filmed demonstrations and paid learning materials are <strong>still in development</strong>; this written lesson is free.</p></section>',
    '<nav class="pc-lesson-end" aria-label="After this lesson"><a class="pc-button pc-button-primary" href="/courses/">Return to Learn <span aria-hidden="true">→</span></a><a class="pc-button" href="/setup/">See my current setup <span aria-hidden="true">→</span></a></nav>',
    '</div></div></article>'
  ].join("");
}
