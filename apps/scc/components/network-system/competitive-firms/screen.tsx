"use client";

import { useState } from "react";
import styled from "styled-components";
import { directedLine, internalConnections, splitInternalEdge, variableNodes } from "./graph";
import { createInitialCompetitiveFirmsSnapshot, screenFirmMap, type CompetitiveFirmsSnapshot, type FirmId, type FirmVariableId } from "./model";
import { useCompetitiveFirmsSocket } from "./use-competitive-firms-socket";
import type { NetworkSystemScreenId } from "@/components/network-system/experiments";

const UP="#3f6652", DOWN="#8a5838", STEADY="#343431";
const Page=styled.main`position:fixed;inset:0;overflow:hidden;background:#11110f;`;
const Single=styled.div`position:absolute;inset:0;`;
const Grid=styled.div`position:absolute;inset:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));`;
const Pane=styled.section`position:relative;width:100%;height:100%;min-width:0;min-height:0;overflow:hidden;background:#f2f1ed;`;
const Canvas=styled.div<{ $scale:number }>`position:absolute;inset:0;width:${({$scale})=>100/$scale}%;height:${({$scale})=>100/$scale}%;transform:scale(${({$scale})=>$scale});transform-origin:top left;container-type:size;background:#f2f1ed;color:#11110f;font-family:Arial,Helvetica,sans-serif;font-variant-numeric:tabular-nums;`;
const Header=styled.header`position:absolute;left:3.5cqw;right:3.5cqw;top:3.2cqh;display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid;padding-bottom:1.1cqh;z-index:3;h1,p{margin:0}h1{font-size:clamp(12px,1.55cqw,24px);font-weight:500}p{font:500 clamp(11px,1.35cqw,20px)/1 monospace}`;
const Graph=styled.svg`position:absolute;inset:0;width:100%;height:100%;pointer-events:none;`;
const Edge=styled.line.attrs<{ $flow:number }>(({ $flow })=>({style:{stroke:$flow>.002?UP:$flow<-.002?DOWN:STEADY,strokeDasharray:$flow<-.002?"4 3":"none",strokeWidth:.65+Math.min(Math.abs($flow)*7,1.8)}}))`stroke-opacity:.72;vector-effect:non-scaling-stroke;`;
const Dot=styled.circle.attrs<{ $flow:number }>(({ $flow })=>({style:{fill:$flow>.002?UP:$flow<-.002?DOWN:STEADY,opacity:.25+Math.min(Math.abs($flow)*4,.7)}}))``;
const Node=styled.div<{ $x:number;$y:number }>`position:absolute;left:${({$x})=>$x*100}%;top:${({$y})=>$y*100}%;width:clamp(146px,28vmin,236px);aspect-ratio:1;display:grid;grid-template-rows:1fr auto;overflow:hidden;border:1px solid;border-radius:50%;background:#f2f1ed;transform:translate(-50%,-50%);z-index:2;`;
const Readout=styled.div`display:grid;place-content:center;text-align:center;padding-top:10%;strong,output,small{display:block}strong{font-size:clamp(11px,1.5vmin,16px);font-weight:500;letter-spacing:.03em}output{margin-top:clamp(5px,.9vmin,9px);font-size:clamp(28px,5.2vmin,52px);font-weight:300;letter-spacing:-.05em}small{margin-top:5px;font:500 clamp(9px,1.1vmin,13px)/1 monospace}`;
const Control=styled.div`display:grid;grid-template-columns:1fr auto 1fr;border-top:1px solid;min-height:36%;button{border:0;background:transparent;color:inherit;font:400 clamp(24px,4vmin,40px)/1 Arial;cursor:pointer}button:hover,button:focus-visible{background:#11110f;color:#f2f1ed;outline:0}span{display:grid;place-content:center;min-width:clamp(48px,8vmin,72px);border-left:1px solid;border-right:1px solid;text-align:center;font:500 clamp(10px,1.2vmin,14px)/1.1 monospace}`;
const policyNames:Record<FirmVariableId,string>={product:"R&D",price:"TARGET",capacity:"TARGET",capital:"LEVERAGE"};
const policySteps:Record<FirmVariableId,number>={product:.02,price:.05,capacity:.08,capital:.1};
function format(id:FirmVariableId,value:number){return id==="price"?`${value.toFixed(2)}×`:value.toFixed(2)}
function policyFormat(id:FirmVariableId,value:number){return id==="product"?`${(value*100).toFixed(0)}%`:value.toFixed(2)}
function pointAlong(g:{x1:number;y1:number;x2:number;y2:number},p:number){return{x:g.x1+(g.x2-g.x1)*p,y:g.y1+(g.y2-g.y1)*p}}

function FirmGraph({firmId,snapshot,onManage}:{firmId:FirmId;snapshot:CompetitiveFirmsSnapshot;onManage:(id:FirmVariableId,amount:number)=>void}){
 const progress=.15+((snapshot.revision%30)/29)*.7; const getNode=(id:FirmVariableId)=>variableNodes.find(n=>n.id===id)!;
 return <><Header><h1>COMPANY {firmId}</h1><p>MARKET SHARE {(snapshot.marketShares[firmId]*100).toFixed(1)}%</p></Header>
 <Graph viewBox="0 0 1 1" preserveAspectRatio="none"><defs><marker id={`inner-arrow-${firmId}`} markerHeight="6" markerWidth="6" orient="auto" refX="5" refY="3" viewBox="0 0 6 6"><path d="M0 0L6 3L0 6Z" fill="context-stroke"/></marker></defs>
 {internalConnections.map(({id,reverse})=>{const[from,to]=splitInternalEdge(id);const g=directedLine(getNode(from).point,getNode(to).point,Boolean(reverse),.2);const flow=snapshot.internalFlows[firmId][id];const d=pointAlong(g,progress);return <g key={id}><Edge {...g} $flow={flow} markerEnd={`url(#inner-arrow-${firmId})`}/><Dot cx={d.x} cy={d.y} r=".0045" $flow={flow}/></g>})}</Graph>
 {variableNodes.map((node)=>{const policy=snapshot.managementPolicies[firmId][node.id];return <Node key={node.id} $x={node.point.x} $y={node.point.y}><Readout><strong>{node.label}</strong><output>{format(node.id,snapshot.firms[firmId][node.id])}</output><small>{policyNames[node.id]} {policyFormat(node.id,policy)}</small></Readout><Control><button aria-label={`Decrease ${policyNames[node.id]}`} onPointerDown={()=>onManage(node.id,-policySteps[node.id])}>−</button><span>{policyNames[node.id]}</span><button aria-label={`Increase ${policyNames[node.id]}`} onPointerDown={()=>onManage(node.id,policySteps[node.id])}>+</button></Control></Node>})}</>;
}
function FirmPane({firmId,scale}:{firmId:FirmId;scale:number}){const[fallback]=useState(createInitialCompetitiveFirmsSnapshot);const{state,sendIntervention}=useCompetitiveFirmsSocket({role:"screen",firmId});const snapshot=state??fallback;return <Pane><Canvas $scale={scale}><FirmGraph firmId={firmId} snapshot={snapshot} onManage={(variableId,amount)=>sendIntervention({kind:"management",firmId,variableId,amount})}/></Canvas></Pane>}
export function CompetitiveFirmsScreenExperience({screenIds}:{screenIds:readonly NetworkSystemScreenId[]}){if(screenIds.length===1)return <Page><Single><FirmPane firmId={screenFirmMap[screenIds[0]]} scale={1}/></Single></Page>;return <Page><Grid>{screenIds.map(id=><FirmPane key={id} firmId={screenFirmMap[id]} scale={.5}/>)}</Grid></Page>}
export default function CompetitiveFirmsScreen({screenId}:{screenId:NetworkSystemScreenId}){return <CompetitiveFirmsScreenExperience screenIds={[screenId]}/>}
