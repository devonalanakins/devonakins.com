/**
 * Devon's public quality standard. This is a statement of how he evaluates
 * work, not a claim that every historical project has passed these gates.
 * The four outcomes must be independently demonstrated before "finished".
 */
export const qualityGates = Object.freeze([
  { key:"product",number:"01",label:"PRODUCT",short:"Useful",
    title:"A real person can use it.",
    description:"Understand the actual problem, preserve what already works, and deliver a complete task—not an attractive demonstration.",
    proof:"Acceptance: a meaningful real-world task and a non-expert walkthrough." },
  { key:"experience",number:"02",label:"EXPERIENCE",short:"Intentional",
    title:"The experience earns its place.",
    description:"Every interaction, composition, transition and responsive state should belong to one coherent idea. Technical correctness cannot excuse a rejected design.",
    proof:"Acceptance: visual review, accessible interaction and device testing." },
  { key:"engineering",number:"03",label:"ENGINEERING",short:"Verified",
    title:"The system holds up under inspection.",
    description:"Test the actual integrations, security boundaries, failure states and deployment. A green test suite is evidence, not permission to assume the whole system works.",
    proof:"Acceptance: independently observed technical and production behavior." },
  { key:"stewardship",number:"04",label:"STEWARDSHIP",short:"Teachable",
    title:"Someone else can keep it running.",
    description:"Record the decisions, explain the architecture, make operations understandable and improve from verified results without erasing approved work.",
    proof:"Acceptance: an intelligible handoff and repeatable operating process." },
]);
const esc = value => String(value).replace(/[&<>"']/g,
  c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export function renderWorkingStandard(){
  return '<section class="one-method-workbench one-panel" aria-label="How Devon defines finished work">'+
    '<div class="one-method-overline"><span>THE WORKING STANDARD</span><span>FOUR INDEPENDENT CHECKS</span></div>'+
    '<div class="one-method-controls" role="group" aria-label="Explore the four quality checks">'+
      qualityGates.map((gate,i)=>'<button type="button" class="one-method-control" data-method-select="'+gate.key+
        '" aria-controls="one-method-'+gate.key+'" aria-pressed="'+(i===0?'true':'false')+'">'+
        '<span>'+gate.number+'</span><strong>'+esc(gate.short)+'</strong></button>').join('')+
    '</div>'+
    '<div class="one-method-content" aria-live="polite">'+
      qualityGates.map((gate,i)=>'<section id="one-method-'+gate.key+'" class="one-method-detail" data-method-panel="'+gate.key+'"'+(i?' hidden':'')+'>'+
        '<span class="one-method-phase">'+esc(gate.label)+' / '+gate.number+'</span>'+
        '<h2>'+esc(gate.title)+'</h2>'+
        '<p>'+esc(gate.description)+'</p>'+
        '<div class="one-method-proof"><span aria-hidden="true"></span>'+esc(gate.proof)+'</div>'+
        '</section>').join('')+
    '</div>'+
    '<p class="one-method-rule"><b>FINISHED</b> means all four are supported by evidence. None substitutes for another.</p>'+
  '</section>';
}
