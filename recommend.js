(function(root){
 'use strict';
 const labels=['가로','세로','높이'];
 const orders=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
 function recommend(raw,padding,boxes){
  const errors=raw.map((v,i)=>{
   const s=String(v??'').trim();
   if(!s)return `${labels[i]}를 입력해주세요.`;
   if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)||!Number.isFinite(Number(s)))return `${labels[i]}에 올바른 숫자를 입력해주세요.`;
   if(Number(s)<=0)return `${labels[i]}는 0보다 커야 합니다.`;
   return null;
  });
  if(errors.some(Boolean))return {errors};
  if(![0,1,2,3,5].includes(padding))return {errors:['포장 여유를 선택해주세요.']};
  const original=raw.map(Number),needed=original.map(v=>v+padding);
  const fits=(a,b)=>a<=b||Math.abs(a-b)<=Number.EPSILON*Math.max(a,b)*4;
  const matches=boxes.flatMap(box=>{
   const order=orders.find(order=>order.every((axis,i)=>fits(needed[axis],box.size[i])));
   return order?[{...box,order,oriented:order.map(axis=>original[axis]),volume:box.size.reduce((a,b)=>a*b,1)}]:[];
  }).sort((a,b)=>a.volume-b.volume||a.id.localeCompare(b.id)).slice(0,3);
  return {errors:[],original,needed,padding,matches};
 }
 root.BoxFit={recommend,labels};
 if(typeof module!=='undefined')module.exports=root.BoxFit;
})(globalThis);
