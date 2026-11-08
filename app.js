'use strict';
const form=document.querySelector('#box-form');
const fields=['width','depth','height'].map(id=>document.getElementById(id));
const results=document.querySelector('#results'),error=document.querySelector('#input-error');
const initial=results.innerHTML;
const number=v=>v.toLocaleString('ko-KR',{maximumSignificantDigits:15});
const size=values=>values.map(number).join(' × ');
function clearErrors(){error.hidden=true;error.textContent='';fields.forEach(f=>f.removeAttribute('aria-invalid'));}
form.addEventListener('submit',event=>{
 event.preventDefault();clearErrors();
 const result=BoxFit.recommend(fields.map(f=>f.value),Number(form.elements.padding.value),BOXFIT_BOXES);
 if(result.errors.some(Boolean)){
  error.textContent=result.errors.filter(Boolean).join(' ');error.hidden=false;
  result.errors.forEach((message,i)=>{if(message&&fields[i])fields[i].setAttribute('aria-invalid','true');});
  results.innerHTML='<div class="empty"><h3>입력한 크기를 확인해주세요</h3><p>올바른 크기를 입력하면 추천 결과가 표시돼요.</p></div>';
  fields.find(f=>f.getAttribute('aria-invalid')==='true')?.focus();return;
 }
 const summary=`<div class="needed"><span>여유를 포함한 필요 내부 크기</span><strong>${size(result.needed)} <small>cm</small></strong><span>입력한 가로 × 세로 × 높이 순서 · 여유 ${result.padding} cm</span></div>`;
 if(!result.matches.length){results.innerHTML=summary+'<div class="empty no-match"><span aria-hidden="true">↗</span><h3>조금 더 큰 박스가 필요해요</h3><p>예시 규격 중에는 맞는 박스가 없어요.<br>위 크기 이상의 내부 공간을 가진 박스를 찾아주세요.<br>물건을 회전하면 치수 순서는 달라질 수 있어요.</p></div>';return;}
 results.innerHTML=summary+`<p class="count">맞는 박스 <strong>${result.matches.length}개</strong>를 골랐어요 <span>내부 가로 × 세로 × 높이</span></p>`+result.matches.map((box,i)=>`<article class="box-card ${i===0?'best':''}"><div class="card-top"><div><span class="rank">${String(i+1).padStart(2,'0')}</span><h3>${box.name}</h3><span class="box-id">${box.id}</span></div>${i===0?'<span class="badge">가장 작은 박스</span>':''}</div><div class="box-size">${size(box.size)} <small>cm</small></div><p class="volume">내부 부피 <strong>${number(box.volume)} cm³</strong></p><div class="orientation"><span aria-hidden="true">↻</span><p>넣는 방향 <strong>${size(box.oriented)} cm</strong><br><span>박스 가로 ← 물건 ${BoxFit.labels[box.order[0]]} · 세로 ← ${BoxFit.labels[box.order[1]]} · 높이 ← ${BoxFit.labels[box.order[2]]}</span></p></div></article>`).join('')+'<p class="result-note">넣는 방향은 물건 원래 크기 기준이며, 포장 여유도 함께 확인했어요.</p>';
});
document.querySelector('#example').addEventListener('click',()=>{[20,15,10].forEach((v,i)=>fields[i].value=v);form.elements.padding.value='2';form.requestSubmit();});
form.addEventListener('reset',()=>{clearErrors();results.innerHTML=initial;});
form.addEventListener('input',clearErrors);
