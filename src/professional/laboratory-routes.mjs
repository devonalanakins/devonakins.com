/** Public cinematic routes; data publication remains owned by the existing manifest. */
export const LABORATORY_ROUTES=Object.freeze({home:'/',experience:'/research/',systems:'/systems/',work:'/work/',portfolio:'/portfolio/',activity:'/activity/',writing:'/fieldnotes/',contact:'/contact/'});
export const LABORATORY_REDIRECTS=Object.freeze({'/projects/':'/work/','/writing/':'/fieldnotes/','/experience/':'/systems/','/about/':'/portfolio/','/source/':'/systems/','/studio/':'/activity/','/gpt/':'/activity/'});
export function laboratoryViewForPath(path){
  return Object.entries(LABORATORY_ROUTES).find(([,value])=>value===path)?.[0]||null;
}
