/** The laboratory's mathematical illustration is pure local computation.
 * No provider activity, clinical data, experiment result or web API is used.
 */
const curve=document.querySelector<SVGPathElement>('[data-lab-curve="interactive"]');
const inputA=document.querySelector<HTMLInputElement>('[data-lab-axis="a"]');
const inputB=document.querySelector<HTMLInputElement>('[data-lab-axis="b"]');
const outputA=document.querySelector<HTMLOutputElement>('[data-lab-value="a"]');
const outputB=document.querySelector<HTMLOutputElement>('[data-lab-value="b"]');
const caption=document.querySelector<HTMLElement>('[data-lab-model-caption]');
function integerFrequency(value:string):number{
  const n=Number(value);
  return Number.isInteger(n)&&n>=1&&n<=6?n:1;
}
function lissajous(a:number,b:number):string{
  const points:string[]=[];
  for(let index=0;index<=300;index++){
    const t=index/300*Math.PI*2;
    const x=(320+166*Math.sin(a*t)).toFixed(2);
    const y=(230-145*Math.sin(b*t+Math.PI/2)).toFixed(2);
    points.push((index===0?'M':'L')+x+' '+y);
  }
  return points.join(' ');
}
function redraw(){
  if(!inputA||!inputB||!curve)return;
  const a=integerFrequency(inputA.value);
  const b=integerFrequency(inputB.value);
  curve.setAttribute('d',lissajous(a,b));
  if(outputA)outputA.textContent=String(a);
  if(outputB)outputB.textContent=String(b);
  if(caption)caption.textContent='Analytic Lissajous model: a = '+a+', b = '+b+
    ', phase = π/2. Calculated locally; no experimental measurement.';
}
inputA?.addEventListener('input',redraw);
inputB?.addEventListener('input',redraw);
redraw();
const motions=[...document.querySelectorAll<HTMLButtonElement>('[data-lab-motion], [data-lab-motion-footer]')];
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
let userPause=false;
function syncMotion(){
  const running=!userPause&&!reduce.matches;
  document.body.classList.toggle('lab-motion-paused',!running);
  for(const motion of motions){
    motion.setAttribute('aria-pressed',String(running));
    motion.textContent=motion.hasAttribute('data-lab-motion-footer')?(running?'Pause motion':'Resume motion'):(running?'MOTION ON':'MOTION OFF');
    motion.setAttribute('aria-label',running?'MOTION ON — Pause decorative motion':'MOTION OFF — Resume decorative motion');
    motion.disabled=reduce.matches;
    motion.title=reduce.matches?'Reduced motion is enabled in system settings':'';
  }
}
motions.forEach(motion=>motion.addEventListener('click',()=>{userPause=!userPause;syncMotion()}));
reduce.addEventListener('change',syncMotion);
syncMotion();
export {};

// Native modal supplies focus containment, Escape dismissal and background inertness.
const menu=document.querySelector<HTMLDialogElement>('#lab-menu');
const menuOpeners=[...document.querySelectorAll<HTMLButtonElement>('[data-lab-menu-open]')];
const menuClose=document.querySelector<HTMLButtonElement>('[data-lab-menu-close]');
menuOpeners.forEach(menuOpen=>menuOpen.addEventListener('click',()=>{
  menu?.showModal();
  menuOpen.setAttribute('aria-expanded','true');
  document.documentElement.classList.add('lab-menu-open');
}));
menuClose?.addEventListener('click',()=>menu?.close());
// Dismiss the modal before the route controller restores focus and scrolling.
function dismissMenuForHistory(){if(menu?.open)menu.close()}
window.addEventListener('popstate',dismissMenuForHistory,{capture:true});
window.addEventListener('hashchange',dismissMenuForHistory,{capture:true});
menu?.addEventListener('close',()=>{
  menuOpeners.forEach(opener=>opener.setAttribute('aria-expanded','false'));
  document.documentElement.classList.remove('lab-menu-open');
});
menu?.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target.closest<HTMLElement>('[data-one-target]'):null;
  if(!target)return;
  menu.close();
  document.querySelector<HTMLElement>('[data-one-view="'+target.dataset.oneTarget+'"]')?.focus({preventScroll:true});
  window.scrollTo({top:0,behavior:'instant'});
});
const search=document.querySelector<HTMLInputElement>('[data-lab-project-search]');
const category=document.querySelector<HTMLSelectElement>('[data-lab-project-filter]');
const projectCount=document.querySelector<HTMLElement>('[data-lab-project-count]');
const projectCards=[...document.querySelectorAll<HTMLElement>('[data-lab-project]')];
function filterProjects(){
  const query=(search?.value||'').toLocaleLowerCase().trim();
  let count=0;
  for(const card of projectCards){
    const visible=(!query||card.textContent?.toLocaleLowerCase().includes(query))&&
      (!category?.value||category.value==='all'||card.dataset.category===category.value);
    card.hidden=!visible;
    if(visible)count++;
  }
  if(projectCount)projectCount.textContent=count+' public project'+(count===1?'':'s')+(count?'':' · No matching projects. Try another search.');
}
search?.addEventListener('input',filterProjects);
category?.addEventListener('change',filterProjects);
