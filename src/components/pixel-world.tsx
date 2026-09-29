'use client';

import { useEffect, useRef, useState } from 'react';

// Stylized low-resolution continent outlines, projected onto a rotating sphere.
const continents = [
  [[-168,68],[-140,72],[-125,57],[-110,52],[-96,51],[-80,58],[-55,52],[-65,43],[-80,26],[-98,18],[-109,30],[-124,40],[-135,58]],
  [[-82,12],[-65,10],[-48,-1],[-35,-8],[-44,-23],[-58,-39],[-70,-55],[-77,-26],[-80,-5]],
  [[-18,35],[6,38],[32,30],[43,12],[51,10],[40,-17],[20,-35],[12,-24],[3,-4],[-15,6]],
  [[-10,36],[-8,57],[9,70],[32,71],[48,58],[80,73],[135,70],[175,58],[143,45],[129,34],[119,20],[108,1],[95,6],[78,8],[65,26],[42,30],[30,42],[12,44]],
  [[112,-12],[135,-10],[154,-23],[148,-39],[126,-35],[114,-24]],
  [[-54,60],[-28,66],[-22,81],[-48,84],[-65,73]],
  [[47,-13],[51,-16],[49,-26],[44,-24]], [[130,32],[141,45],[146,41],[139,32]],
];
function inside(x:number,y:number,polygon:number[][]) {
  let yes=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [a,b]=polygon[i], [c,d]=polygon[j];
    if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a) yes=!yes;
  }
  return yes;
}

export function PixelWorld() {
  const canvas=useRef<HTMLCanvasElement>(null);
  const angle=useRef(.35);
  const drag=useRef<number|null>(null);
  const [paused,setPaused]=useState(false);
  const [reduced,setReduced]=useState(false);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setReduced(media.matches); update();
    media.addEventListener('change',update);
    return ()=>media.removeEventListener('change',update);
  },[]);
  useEffect(()=>{
    const ctx=canvas.current?.getContext('2d'); if(!ctx)return;
    let frame=0,last=0;
    const draw=(time:number)=>{
      if(time-last>65 || last===0){
        if(!paused&&!reduced&&drag.current===null&&last!==0) angle.current+=Math.min(time-last,100)*.00012;
        last=time; ctx.clearRect(0,0,160,160);
        for(let y=5;y<155;y++)for(let x=5;x<155;x++){
          const nx=(x-80)/74,ny=(y-80)/74,r=nx*nx+ny*ny; if(r>1)continue;
          const z=Math.sqrt(1-r);
          const lat=Math.asin(-ny)*180/Math.PI;
          const lon=((Math.atan2(nx,z)+angle.current)*180/Math.PI+540)%360-180;
          const land=continents.some(p=>inside(lon,lat,p));
          const noise=Math.sin(Math.floor(lon/4)*17+Math.floor(lat/4)*39);
          const cloud=Math.sin(lon*.09+lat*.12)+Math.sin(lon*.21-lat*.17)>1.47;
          const light=Math.max(.19,Math.min(1,(-nx*.48-ny*.57+z*.67)));
          let rgb=land?(noise>.3?[161,199,102]:[99,158,76]):(noise>.2?[59,141,152]:[38,110,135]);
          if(cloud||Math.abs(lat)>72)rgb=[240,237,194];
          if(r>.95&&nx-ny>.1)rgb=[250,235,188];
          ctx.fillStyle=`rgb(${rgb.map(v=>Math.round(v*light)).join(',')})`;
          ctx.fillRect(x,y,1,1);
        }
      }
      frame=requestAnimationFrame(draw);
    }; draw(0); return ()=>cancelAnimationFrame(frame);
  },[paused,reduced]);
  return <div className="pixel-world">
    <div className="world-coordinate" aria-hidden="true">EARTH / 01<br/>A WORLD OF POSSIBILITIES</div>
    <canvas ref={canvas} width={160} height={160} role="img" aria-label="Rotating pixel art Earth. Drag horizontally to rotate." onPointerDown={e=>{drag.current=e.clientX;e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current!==null){angle.current+=(e.clientX-drag.current)*.009;drag.current=e.clientX;}}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}/>
    <button type="button" className="orbit-object orbit-cube" aria-label="Rotate the globe left" onClick={()=>{angle.current-=.5;}}><svg viewBox="0 0 60 64" aria-hidden="true"><path d="m30 2 26 15-26 16L4 17Z" fill="#d8ffa3"/><path d="m4 17 26 16v29L4 46Z" fill="#76a34b"/><path d="m30 33 26-16v29L30 62Z" fill="#b1f879"/></svg><span>ROTATE ↶</span></button>
    <button type="button" className="orbit-object orbit-crystal" aria-label="Rotate the globe right" onClick={()=>{angle.current+=.5;}}><svg viewBox="0 0 46 70" aria-hidden="true"><path d="M23 1 44 35 23 69 2 35Z" fill="#a7a1fb"/><path d="M23 1v68L2 35Z" fill="#676794"/><path d="m2 35 21-9 21 9-21 9Z" fill="#d9d6ff"/></svg><span>ROTATE ↷</span></button>
    <div className="world-controls"><span>DRAG TO EXPLORE</span><button type="button" onClick={()=>setPaused(p=>!p)} aria-pressed={paused}>{paused?'[ RESUME ]':'[ PAUSE ]'}</button></div>
  </div>;
}
