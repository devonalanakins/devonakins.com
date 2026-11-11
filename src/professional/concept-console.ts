/**
 * First-party keyboard-friendly exploratory interactions for the Living Console.
 * Controls change explanatory text only; no synthetic data, live status or API.
 */
const processes = [
  'Observe people, constraints, and what already works.',
  'Decide what useful and exceptional should mean.',
  'Select the smallest coherent working system.',
  'Name the evidence required before implementation.',
  'Build, inspect, test, and validate in real use.',
  'Record decisions and make the result teachable.',
];
const quality = new Map([
  ['product','Someone can complete a real task.'],
  ['experience','Interaction and design meet the chosen vision.'],
  ['engineering','Real behavior, security and failure modes withstand testing.'],
  ['stewardship','The result can be explained, operated and maintained.'],
]);
const processButtons=[...document.querySelectorAll<HTMLButtonElement>('[data-process-step]')];
const processDetail=document.querySelector<HTMLElement>('[data-process-detail]');
const qualityButtons=[...document.querySelectorAll<HTMLButtonElement>('[data-concept-gate]')];
const qualityDetail=document.querySelector<HTMLElement>('[data-concept-gate-detail]');
function selectProcess(index:number,focus=false){
  if(!Number.isInteger(index)||index<0||index>=processes.length)return;
  processButtons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  if(processDetail)processDetail.textContent=processes[index];
  if(focus)processButtons[index]?.focus({preventScroll:true});
}
function selectQuality(key:string,focus=false){
  const description=quality.get(key);
  if(!description)return;
  qualityButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.conceptGate===key)));
  if(qualityDetail)qualityDetail.textContent=description;
  if(focus)qualityButtons.find(button=>button.dataset.conceptGate===key)?.focus({preventScroll:true});
}
function advance(event:KeyboardEvent,buttons:HTMLButtonElement[],index:number,select:(next:number)=>void){
  const dir=event.key==='ArrowRight'||event.key==='ArrowDown'?1:
    event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:0;
  const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:
    dir?(index+dir+buttons.length)%buttons.length:-1;
  if(next<0)return;
  event.preventDefault();select(next);
}
processButtons.forEach((button,index)=>{
  button.addEventListener('click',()=>selectProcess(index));
  button.addEventListener('keydown',event=>advance(event,processButtons,index,next=>selectProcess(next,true)));
});
qualityButtons.forEach((button,index)=>{
  button.addEventListener('click',()=>selectQuality(button.dataset.conceptGate||''));
  button.addEventListener('keydown',event=>advance(event,qualityButtons,index,next=>selectQuality(qualityButtons[next]?.dataset.conceptGate||'',true)));
});
export {};
