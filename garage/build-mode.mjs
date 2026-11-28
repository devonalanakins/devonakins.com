// Build-time only. No request, query parameter or persisted setting may change the public homepage.
export function garageBuildMode(env = process.env) {
  const preview=env.GARAGE_SITE_CANDIDATE==="1";
  const home=env.GARAGE_HOME_CANDIDATE==="1";
  const laboratory=env.LABORATORY_SITE_CANDIDATE==="1";
  if(preview&&!laboratory)throw new Error("Garage preview requires the Laboratory candidate");
  if(home&&!(preview&&laboratory))throw new Error("Garage homepage requires both Garage and Laboratory candidates");
  return Object.freeze({preview,home});
}
