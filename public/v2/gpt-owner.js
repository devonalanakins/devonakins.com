// Owner-only batch capture. Blank inputs are never sent or timestamped.
const endpoint = '/api/presence/owner?channel=gpt';
const byId = id => document.getElementById(id);
const inputs = [...document.querySelectorAll('input[data-metric]')];
const number = value => new Intl.NumberFormat('en-US',{maximumSignificantDigits:21}).format(value);
let busy=false, revision=null, conflict=false, generation=0;
const draft = () => inputs.filter(input=>input.value.trim()!=='');
const say = (message,error=false) => {
  byId('gpt-form-status').textContent=message;
  byId('gpt-form-status').dataset.error=String(error);
};
function updateControls() {
  const count=draft().length;
  byId('gpt-draft-summary').textContent=count?`${count} new reading${count===1?'':'s'} ready to save`:'No new readings entered';
  byId('gpt-save').textContent=count?`Save ${count} reading${count===1?'':'s'}`:'Save readings';
  byId('gpt-save').disabled=busy||conflict||revision===null||count===0;
  byId('gpt-reload').disabled=busy;
  byId('gpt-record-form').setAttribute('aria-busy',String(busy));
  inputs.forEach(input=>{input.disabled=busy;});
  document.querySelectorAll('#gpt-owner-records button').forEach(button=>{
    button.disabled=busy||button.dataset.allowed==='false';
  });
}
async function request(method='GET',body) {
  const response=await fetch(endpoint,{method,cache:'no-store',credentials:'same-origin',
    headers:{'Content-Type':'application/json',Accept:'application/json'},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
  if(!response.headers.get('Content-Type')?.includes('application/json'))throw Error('Owner session unavailable. Your entries are still here.');
  const data=await response.json();
  if(!response.ok){const error=Error(data.error||'Analytics unavailable. Your entries are still here.');error.status=response.status;throw error;}
  return data;
}
function render(data) {
  if(!Number.isSafeInteger(data.revision)||data.revision<0||!Array.isArray(data.observations))throw Error('Current analytics revision unavailable. Your entries are still here.');
  revision=data.revision;
  conflict=false;
  const list=byId('gpt-owner-records');
  list.replaceChildren();
  for(const input of inputs) {
    const record=data.observations.find(row=>row.metric===input.dataset.metric);
    const context=byId('gpt-last-'+input.dataset.metric);
    if(!record){context.textContent='No previous reading · Private by default';continue;}
    const date=Number.isFinite(Date.parse(record.asOf))?new Date(record.asOf).toLocaleString():'Unknown capture date';
    context.textContent=`Previous: ${number(record.value)} ${record.unit} · ${date} · ${record.shared?'Sharing enabled':'Private'}`;
    const row=document.createElement('article');row.className='gpt-record-row';
    const title=document.createElement('div');title.className='gpt-record-value';
    const label=document.createElement('strong');label.textContent=record.label;
    const value=document.createElement('span');value.textContent=number(record.value)+' '+record.unit;
    title.append(label,value);
    const meta=document.createElement('p');meta.className='fine';
    meta.textContent=`${record.scope==='owner-profile'?'Personal profile':record.scope==='work-codex'?'Work / Codex':'My Business row'} · Captured ${date} · ${record.freshness==='historical'?'Historical':'Recent'} · ${record.shared?'Sharing enabled':'Private'}`;
    const controls=document.createElement('div');controls.className='gpt-record-actions';
    const share=document.createElement('button');share.type='button';share.className='secondary';
    share.dataset.allowed=String(record.shared||data.publishingAllowed);
    share.textContent=record.shared?'Stop sharing '+record.label:'Share '+record.label;
    share.onclick=()=>{
      if(!record.shared&&!window.confirm('Share this metric and its future recorded updates while public sharing is enabled?'))return;
      void mutate('POST',{action:'sharing',metric:record.metric,enabled:!record.shared,revision:record.revision,captureRevision:revision});
    };
    const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Delete '+record.label;
    remove.onclick=()=>{
      if(!window.confirm('Permanently delete this saved reading?'))return;
      void mutate('DELETE',{metric:record.metric,revision:record.revision,captureRevision:revision});
    };
    controls.append(share,remove);row.append(title,meta,controls);list.append(row);
  }
  byId('gpt-owner-status').textContent=`${data.observations.length} saved metric${data.observations.length===1?'':'s'}. `+
    (data.publishingAllowed?'Sharing is optional for each metric.':'The public release gate is off.');
}
async function refresh(explicit=false) {
  if(busy||document.hidden||(!explicit&&draft().length))return;
  busy=true;updateControls();
  const current=++generation;
  try{const data=await request();if(current===generation){render(data);say(explicit?'Current records loaded. Review any entries you kept, then save.':'Ready. Enter only the measurements you checked.');}}
  catch(error){if(current===generation)say(error.message,true);}
  finally{busy=false;updateControls();}
}
async function mutate(method,body,entered=[]) {
  if(busy)return;
  busy=true;++generation;updateControls();say('Saving securely…');
  try {
    const result=await request(method,body);
    entered.forEach(input=>{input.value='';});
    if(Number.isSafeInteger(result.revision))revision=result.revision;
    // A failure to reload after a successful write must never claim the save failed.
    try{render(await request());}
    catch{say('Saved. Latest records could not reload; refresh to check them.');return;}
    say(entered.length?`${result.count} reading${result.count===1?'':'s'} saved together. Blank fields and sharing permissions were preserved.`:'Privacy setting saved.');
  } catch(error) {
    if(error.status===409){conflict=true;say(error.message+' Your entries are preserved. Use Refresh records to review the latest values.',true);}
    else say(error.message+' Your entries are preserved; refresh records before retrying an uncertain save.',true);
  } finally{busy=false;updateControls();}
}
byId('gpt-record-form').addEventListener('submit',event=>{
  event.preventDefault();
  if(busy||conflict||revision===null)return;
  const entered=draft();
  if(!entered.length){say('Enter at least one reading. Blank fields stay unchanged.');return;}
  for(const input of entered){
    const value=Number(input.value);
    if(!input.checkValidity()||!Number.isFinite(value)||value<0||value>Number(input.max)||(input.step==='1'&&!Number.isSafeInteger(value))){
      say('Check the highlighted measurement. Nothing was saved.',true);input.reportValidity();input.focus();return;
    }
  }
  void mutate('POST',{action:'record-batch',revision,measurements:entered.map(input=>({metric:input.dataset.metric,value:Number(input.value)}))},entered);
});
inputs.forEach(input=>input.addEventListener('input',updateControls));
byId('gpt-reload').onclick=()=>void refresh(true);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
window.setInterval(()=>{if(!document.hidden)void refresh();},300000);
updateControls();void refresh();
