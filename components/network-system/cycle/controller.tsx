"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { cycleEdges, cycleNodes, getCycleNode } from "@/components/network-system/cycle/graph";
import { createInitialCycleSnapshot, cycleNodeLabels, type CycleNodeId } from "@/components/network-system/cycle/model";
import { useCycleSocket } from "@/components/network-system/cycle/use-cycle-socket";

const Page=styled.main`position:fixed;inset:0;overflow:hidden;background:#f2f1ed;color:#11110f;font-family:Arial,Helvetica,sans-serif;touch-action:none;`;
const Graph=styled.svg`position:absolute;inset:0;width:100%;height:100%;pointer-events:none;`;
const Reset=styled.button`position:absolute;top:16px;right:16px;z-index:5;height:34px;padding:0 12px;border:1px solid #11110f;background:#f2f1ed;color:#11110f;font:11px/1 "SFMono-Regular",Consolas,monospace;cursor:pointer;&:hover,&:active,&:focus-visible{background:#11110f;color:#f2f1ed;outline:none;}`;
const Node=styled.button<{$x:number;$y:number}>`position:absolute;left:${p=>p.$x*100}%;top:${p=>p.$y*100}%;z-index:3;display:grid;place-content:center;width:clamp(82px,15vmin,150px);aspect-ratio:1;padding:0;border:1px solid #11110f;border-radius:50%;box-sizing:border-box;background:#f2f1ed;color:#11110f;text-align:center;transform:translate(-50%,-50%);cursor:pointer;strong{display:block;width:72%;margin:auto;font-size:clamp(7px,1.05vmin,11px);font-weight:500;line-height:1.08;letter-spacing:.02em}small{display:block;margin-top:4px;font:10px/1 "SFMono-Regular",Consolas,monospace}&:focus-visible{outline:2px solid #11110f;outline-offset:2px}`;
const Control=styled.div<{$x:number;$y:number}>`position:absolute;left:${p=>p.$x*100}%;top:${p=>p.$y*100}%;z-index:4;display:grid;justify-items:center;gap:2px;padding:2px;background:#f2f1ed;transform:translate(-50%,-50%);>span{font:8px/1 "SFMono-Regular",Consolas,monospace;white-space:nowrap}`;
const Direction=styled.div`display:grid;grid-template-columns:36px auto;align-items:center;gap:3px;>span{font:8px/1 "SFMono-Regular",Consolas,monospace;text-align:right}`;
const Weight=styled.div`display:grid;grid-template-columns:26px 40px 26px;border:1px solid #11110f;background:#f2f1ed;`;
const Button=styled.button`width:26px;height:26px;border:0;background:transparent;color:#11110f;font-size:17px;cursor:pointer;&:hover,&:active,&:focus-visible{background:#11110f;color:#f2f1ed;outline:none;}`;
const Value=styled.output`display:grid;place-items:center;border-right:1px solid #11110f;border-left:1px solid #11110f;font:9px/1 "SFMono-Regular",Consolas,monospace;`;
const GDP=styled.output`position:absolute;left:16px;bottom:14px;z-index:5;padding:6px 8px;border:1px solid #11110f;background:#f2f1ed;font:10px/1 "SFMono-Regular",Consolas,monospace;`;
const Explanation=styled.section`position:absolute;left:50%;bottom:14px;z-index:5;width:min(44vw,520px);padding:9px 11px;border:1px solid #11110f;background:#f2f1ed;transform:translateX(-50%);font-size:clamp(10px,1.15vmin,13px);line-height:1.35;strong{display:block;margin-bottom:3px;font:600 clamp(10px,1.15vmin,13px)/1 "SFMono-Regular",Consolas,monospace;letter-spacing:.04em}`;

const codes:Record<CycleNodeId,string>={"household-demand":"HD",production:"PR",inventories:"IN",employment:"EM","wage-share":"WS",investment:"IV",credit:"CR",inflation:"PI","policy-rate":"IR"};
const descriptions:Record<CycleNodeId,string>={
  "household-demand":"가계가 현재 생산물을 얼마나 소비하려 하는지입니다. 고용·임금·신용이 수요를 밀어 올리고, 물가 압력은 실질 구매력을 낮춥니다.",
  production:"기업의 실제 산출 흐름입니다. 수요와 투자에 반응하며, 재고가 쌓이면 생산을 줄입니다. GDP 영상 결과는 이 생산 경로에서 계산됩니다.",
  inventories:"생산된 상품 중 아직 팔리지 않은 재고입니다. 생산이 수요보다 빠르면 늘고, 과잉 재고는 이후 생산 감축 압력으로 돌아옵니다.",
  employment:"생산을 위해 고용된 노동의 상태입니다. 산출과 투자 확대는 고용을 늘리고, 고용 증가는 가계 소득과 임금 협상력으로 이어집니다.",
  "wage-share":"생산 결과 중 임금으로 돌아가는 몫입니다. 소비를 지지하지만, 너무 높으면 기업 투자 여력을 약화시킬 수 있습니다.",
  investment:"기업의 설비·건물·기술 지출입니다. 생산 전망과 신용이 투자에 영향을 주며, 투자는 다시 생산·고용을 움직입니다.",
  credit:"은행·금융시스템이 공급하는 신용 상태입니다. 투자와 소비를 확장시키지만, 금리와 누적 위험이 커지면 위축됩니다.",
  inflation:"수요와 임금 압력에서 나오는 물가 상승 상태입니다. 실질 수요를 누르고, 정책금리 반응을 유발합니다.",
  "policy-rate":"물가와 산출에 반응하는 통화정책 금리입니다. 높아지면 신용과 투자를 억제해 경제 순환에 지연된 제동을 겁니다.",
};
function quadraticPoint(a:{x:number;y:number},c:{x:number;y:number},b:{x:number;y:number},t:number){const u=1-t;return{x:u*u*a.x+2*u*t*c.x+t*t*b.x,y:u*u*a.y+2*u*t*c.y+t*t*b.y};}
const placed:Array<{x:number;y:number}>=[];
const edgeVisuals=cycleEdges.map(edge=>{
  const a=getCycleNode(edge.from),b=getCycleNode(edge.to),dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1;
  let best:{control:{x:number;y:number};point:{x:number;y:number};score:number}|null=null;
  for(const bend of [-.18,-.12,-.06,0,.06,.12,.18])for(const t of [.3,.4,.5,.6,.7]){
    const control={x:(a.x+b.x)/2-dy/length*bend,y:(a.y+b.y)/2+dx/length*bend};
    const point=quadraticPoint(a,control,b,t);
    if(point.x<.055||point.x>.945||point.y<.055||point.y>.945)continue;
    const distances=[...placed.map(p=>Math.hypot((point.x-p.x)*1.7,point.y-p.y)),...cycleNodes.filter(n=>n.id!==edge.from&&n.id!==edge.to).map(n=>Math.hypot((point.x-n.x)*1.7,point.y-n.y))];
    const score=Math.min(...distances)-Math.abs(bend)*.08;
    if(!best||score>best.score)best={control,point,score};
  }
  const visual=best??{control:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},point:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},score:0};
  placed.push(visual.point);
  return{edge,a,b,...visual};
});

export default function CycleController(){
  const [initial]=useState(()=>createInitialCycleSnapshot());
  const {connected,state,sendIntervention,resetSystem}=useCycleSocket({role:"controller"});
  const snapshot=state??initial;
  const [selectedNode,setSelectedNode]=useState<CycleNodeId|null>(null);
  const repeatDelay=useRef<number|null>(null);
  const repeatInterval=useRef<number|null>(null);
  const stopRepeating=useCallback(()=>{
    if(repeatDelay.current!==null)window.clearTimeout(repeatDelay.current);
    if(repeatInterval.current!==null)window.clearInterval(repeatInterval.current);
    repeatDelay.current=null;
    repeatInterval.current=null;
  },[]);
  const startRepeating=useCallback((edgeId:(typeof cycleEdges)[number]["id"],amount:number)=>{
    stopRepeating();
    const change=()=>sendIntervention({kind:"edge-weight",edgeId,amount});
    change();
    repeatDelay.current=window.setTimeout(()=>{
      repeatInterval.current=window.setInterval(change,75);
    },280);
  },[sendIntervention,stopRepeating]);
  useEffect(()=>{
    window.addEventListener("pointerup",stopRepeating);
    window.addEventListener("pointercancel",stopRepeating);
    return()=>{
      window.removeEventListener("pointerup",stopRepeating);
      window.removeEventListener("pointercancel",stopRepeating);
      stopRepeating();
    };
  },[stopRepeating]);
  return <Page>
    <Reset disabled={!connected} onClick={resetSystem}>RESET SYSTEM</Reset>
    <Graph aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 1 1"><defs><marker id="a" markerHeight="6" markerWidth="6" orient="auto" refX="5" refY="3" viewBox="0 0 6 6"><path d="M0 0L6 3L0 6z" fill="#11110f"/></marker></defs>{edgeVisuals.map(({edge,a,b,control})=>{const dx=b.x-control.x,dy=b.y-control.y,l=Math.hypot(dx,dy)||1,end={x:b.x-dx/l*.065,y:b.y-dy/l*.065};return <path key={edge.id} d={`M ${a.x} ${a.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`} fill="none" markerEnd="url(#a)" stroke="#11110f" strokeDasharray={edge.sign<0?"4 3":undefined} strokeOpacity=".65" strokeWidth={.55+snapshot.edgeWeights[edge.id]*.16} vectorEffect="non-scaling-stroke"/>})}</Graph>
    {edgeVisuals.map(({edge,point})=><Control key={edge.id} $x={point.x} $y={point.y}><Direction><span>{codes[edge.from]}→{codes[edge.to]}</span><Weight><Button onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);startRepeating(edge.id,-1)}}>−</Button><Value>{snapshot.edgeWeights[edge.id].toFixed(2)}</Value><Button onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);startRepeating(edge.id,1)}}>+</Button></Weight></Direction></Control>)}
    {cycleNodes.map(n=><Node key={n.id} type="button" aria-pressed={selectedNode===n.id} $x={n.x} $y={n.y} onClick={()=>setSelectedNode(n.id)}><strong>{cycleNodeLabels[n.id]}</strong><small>{snapshot.values[n.id]>=0?"+":""}{snapshot.values[n.id].toFixed(2)}</small></Node>)}
    <GDP>GDP GROWTH {snapshot.gdpGrowth>=0?"+":""}{snapshot.gdpGrowth.toFixed(2)}%</GDP>
    {selectedNode?<Explanation><strong>{cycleNodeLabels[selectedNode]}</strong>{descriptions[selectedNode]}</Explanation>:null}
  </Page>;
}
