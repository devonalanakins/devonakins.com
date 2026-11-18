/**
 * Approved public, nonclinical leadership overview for Nona Neuropsychology.
 * Static editorial content only. Never connect this component to private
 * queues, patient records, financial data, or operational status endpoints.
 */
const workstreams = Object.freeze([
  Object.freeze({
    number: "01",
    label: "COMMUNICATION",
    title: "The first response matters.",
    description: "Clarify who receives inquiries, coordinates referrals, responds to questions and owns each administrative handoff.",
  }),
  Object.freeze({
    number: "02",
    label: "COORDINATION",
    title: "Make the next step visible.",
    description: "Improve scheduling coordination and track nonclinical report-process milestones without accessing or directing clinical conclusions.",
  }),
  Object.freeze({
    number: "03",
    label: "OPERATIONS",
    title: "Give work a clear owner.",
    description: "Document responsibilities, calendar capacity, open administrative work and follow-up expectations across the practice.",
  }),
  Object.freeze({
    number: "04",
    label: "TECHNOLOGY",
    title: "Protect what matters.",
    description: "Evaluate practical staff tools, controlled access and auditability. Sensitive records stay out of unapproved systems.",
  }),
]);

export function renderNonaOperatingBrief() {
  return `<section class="da-nona-brief" aria-labelledby="da-nona-brief-title">
    <div class="da-nona-intro">
      <span class="da-nona-kicker">PUBLIC OPERATING BRIEF / NONCLINICAL</span>
      <h2 id="da-nona-brief-title">The work behind<br>a reliable practice.</h2>
      <p>My executive responsibility is to improve the administrative systems around professional care. These are current priorities, not claims of measured improvement or completed software.</p>
    </div>
    <ol class="da-nona-streams" aria-label="Nonclinical operating priorities">
      ${workstreams.map(item=>`<li>
        <span class="da-nona-stream-head"><b>${item.number}</b><small>${item.label}</small></span>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
      </li>`).join("")}
    </ol>
    <div class="da-nona-evidence" aria-label="Evidence and professional boundaries">
      <div><span>ESTABLISHED</span><strong>Role &amp; scope</strong><p>Executive responsibility for nonclinical operations and technology.</p></div>
      <div><span>MEASUREMENT IN PROGRESS</span><strong>Administrative baselines</strong><p>Intake response, handoff reliability, coordination queues and scheduling capacity require first-hand measurements before publishing results.</p></div>
      <div><span>PROTECTED</span><strong>Clinical authority &amp; privacy</strong><p>Licensed clinicians control evaluations, interpretation, diagnoses and reports. No patient, referral, employee or financial records are published here.</p></div>
    </div>
    <p class="da-nona-disclosure">This is a public description of responsibilities and improvement priorities, not a report of clinical outcomes, payer acceptance, financial performance or released staff systems.</p>
  </section>`;
}
