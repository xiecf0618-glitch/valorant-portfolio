// Fixed-camera pose studies traced against the official inspect reference.
// Local barrel roll X, then Y, then screen-plane Z: Euler order ZYX.
// Positions use the uploaded model's meter-scale coordinates about the grip.
export const DURATION = 3750;
export const KEYS = [
  {t:0, p:[.40,-.30,-.65], r:[0,1.81,-.40]},
  {t:.07,p:[.40,-.30,-.65], r:[0,1.81,-.40]},
  {t:.23,p:[.15,-.27,-.70], r:[.12,2.97,-.28]},
  {t:.49,p:[.145,-.267,-.70], r:[.13,2.97,-.275]},
  {t:.54,p:[.15,-.27,-.70], r:[.12,2.97,-.28]},
  {t:.66,p:[.115,-.28,-.65], r:[3.00,2.90,-1.05]},
  {t:.87,p:[.118,-.278,-.65], r:[2.98,2.90,-1.04]},
  {t:1,p:[.40,-.30,-.65], r:[0,1.81,-.40]},
];
export function poseSegment(progress) {
  const p=Math.max(0,Math.min(1,progress));
  let i=KEYS.findIndex(k=>k.t>=p);if(i<1)i=1;
  const a=KEYS[i-1],b=KEYS[i];let u=(p-a.t)/(b.t-a.t);u=u*u*(3-2*u);
  return {a,b,u};
}
export function samplePose(progress) {
  if(progress<=0||progress>=1)return {p:[...KEYS[0].p],r:[...KEYS[0].r]};
  const {a,b,u}=poseSegment(progress);
  return {p:a.p.map((v,j)=>v+(b.p[j]-v)*u),r:a.r.map((v,j)=>v+(b.r[j]-v)*u)};
}
