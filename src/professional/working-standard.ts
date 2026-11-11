/**
 * Progressive enhancement for the public working-standard explorer.
 * This changes presentation only. No telemetry, third-party calls, storage or
 * claims of completion are produced by this control.
 */
const controls=[...document.querySelectorAll<HTMLButtonElement>("[data-method-select]")];
const panels=[...document.querySelectorAll<HTMLElement>("[data-method-panel]")];
const keys=controls.map(control=>control.dataset.methodSelect).filter((key):key is string=>!!key);
function selectMethod(key:string,focus=false){
  if(!keys.includes(key))return;
  controls.forEach(control=>{
    const active=control.dataset.methodSelect===key;
    control.setAttribute("aria-pressed",String(active));
    if(active&&focus)control.focus({preventScroll:true});
  });
  panels.forEach(panel=>{
    panel.hidden=panel.dataset.methodPanel!==key;
  });
}
controls.forEach(control=>{
  control.addEventListener("click",()=>selectMethod(control.dataset.methodSelect||""));
  control.addEventListener("keydown",event=>{
    const index=keys.indexOf(control.dataset.methodSelect||"");
    const dir=event.key==="ArrowRight"||event.key==="ArrowDown"?1:
      event.key==="ArrowLeft"||event.key==="ArrowUp"?-1:0;
    const next=event.key==="Home"?0:event.key==="End"?keys.length-1:
      dir?(index+dir+keys.length)%keys.length:-1;
    if(next<0)return;
    event.preventDefault();
    selectMethod(keys[next],true);
  });
});

export {};
