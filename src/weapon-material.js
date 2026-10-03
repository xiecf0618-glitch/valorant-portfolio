import * as THREE from 'three';

// The supplied fan model has pale, warm metal and no emissive texture. Derive
// cool steel and a violet-only mask from its own base map; never glow all metal.
export function tuneMaterial(material,anisotropy) {
  material.envMapIntensity=.42;material.roughness=Math.max(material.roughness,.42);
  if(material.map){
    const original=material.map,image=original.image;
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    const color=ctx.getImageData(0,0,canvas.width,canvas.height);
    const mask=document.createElement('canvas');mask.width=canvas.width;mask.height=canvas.height;
    const maskContext=mask.getContext('2d'),emission=maskContext.createImageData(mask.width,mask.height);
    for(let i=0;i<color.data.length;i+=4){
      const r=color.data[i]/255,g=color.data[i+1]/255,b=color.data[i+2]/255;
      let purple=Math.max(0,Math.min(1,((Math.max(r,b)-g)/Math.max(r,b,.01)-.12)/.30));purple=purple*purple*(3-2*purple);
      const l=.2126*r+.7152*g+.0722*b;
      const steel=[l*.43,l*.46,l*.54],violet=[r*.72,g*.35,Math.min(1,b*1.45)];
      for(let c=0;c<3;c++)color.data[i+c]=255*(steel[c]*(1-purple)+violet[c]*purple);
      emission.data[i]=255*purple*.22;emission.data[i+1]=255*purple*.018;emission.data[i+2]=255*purple*.78;emission.data[i+3]=255;
    }
    ctx.putImageData(color,0,0);maskContext.putImageData(emission,0,0);
    const map=original.clone();map.source=new THREE.Source(canvas);map.needsUpdate=true;material.map=map;
    const emissive=original.clone();emissive.source=new THREE.Source(mask);emissive.needsUpdate=true;emissive.colorSpace=THREE.SRGBColorSpace;
    material.emissiveMap=emissive;material.emissive.setHex(0xffffff);material.emissiveIntensity=.7;
    original.dispose();
  }
  for(const map of [material.map,material.normalMap,material.metalnessMap,material.roughnessMap,material.emissiveMap])if(map)map.anisotropy=anisotropy;
  material.needsUpdate=true;
}
