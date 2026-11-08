(function(root){
 'use strict';
 const labels=['가로','세로','높이'];
 const orders=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
 function dimensionErrors(raw){
  return raw.map((v,i)=>{
   // Saved dimensions are numbers and may stringify using exponent notation.
   if(typeof v==='number')return !Number.isFinite(v)?`${labels[i]}에 올바른 숫자를 입력해주세요.`:v<=0?`${labels[i]}는 0보다 커야 합니다.`:null;
   const s=String(v??'').trim();
   if(!s)return `${labels[i]}를 입력해주세요.`;
   if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)||!Number.isFinite(Number(s)))return `${labels[i]}에 올바른 숫자를 입력해주세요.`;
   if(Number(s)<=0)return `${labels[i]}는 0보다 커야 합니다.`;
   return null;
  });
 }
 function createCustomBox(name,raw,id){
  const trimmed=typeof name==='string'?name.trim():'';
  const nameError=!trimmed?'박스 이름을 입력해주세요.':trimmed.length>60?'박스 이름은 60자 이하로 입력해주세요.':null;
  const errors=[nameError,...dimensionErrors(raw)];
  if(errors.some(Boolean))return {errors};
  const size=raw.map(Number),volume=size.reduce((a,b)=>a*b,1);
  if(!Number.isFinite(volume)||volume<=0)return {errors:[null,'계산할 수 있는 범위의 박스 크기를 입력해주세요.',null,null]};
  return {errors:[],box:{id,name:trimmed,size,source:'custom'}};
 }
 function recommend(raw,padding,boxes){
  const errors=dimensionErrors(raw);
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
 root.BoxFit={recommend,createCustomBox,labels};
 if(typeof module!=='undefined')module.exports=root.BoxFit;
})(globalThis);
