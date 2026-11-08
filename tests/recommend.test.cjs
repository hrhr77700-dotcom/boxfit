const {test}=require('node:test');
const assert=require('node:assert/strict');
const {recommend}=require('../recommend.js');
require('../boxes.js');
const boxes=globalThis.BOXFIT_BOXES;
test('회전해서만 들어가는 물건의 방향',()=>{
 const r=recommend(['10','20','15'],0,[{id:'test',size:[20,15,10]}]);
 assert.deepEqual(r.matches[0].order,[1,2,0]);
 assert.deepEqual(r.matches[0].oriented,[20,15,10]);
});
test('여유를 각 축에 한 번 더하고 딱 맞는 박스를 추천',()=>{
 const r=recommend(['20','15','10'],2,boxes);
 assert.deepEqual(r.needed,[22,17,12]);
 assert.equal(r.matches[0].id,'B05');assert.equal(r.matches[0].volume,4488);
 assert.equal(r.matches.length,3);
 assert.ok(r.matches.every((b,i,a)=>!i||a[i-1].volume<=b.volume));
});
test('너무 큰 물건의 필요 최소 크기',()=>{
 const r=recommend(['100','90','80'],2,boxes);
 assert.deepEqual(r.matches,[]);assert.deepEqual(r.needed,[102,92,82]);
});
test('빈 값, 0, 음수, 문자, 잘못된 숫자 거부',()=>{
 for(const v of ['',' ','0','-1','hello','Infinity','NaN','1e309','12cm','1,5','1.2.3'])assert.ok(recommend([v,'10','10'],2,boxes).errors[0],v);
});
test('소수 입력 허용',()=>{
 const r=recommend(['.1','2.5','.5'],1,[{id:'test',size:[1.1,3.5,1.5]}]);
 assert.equal(r.matches.length,1);assert.deepEqual(r.needed,[1.1,3.5,1.5]);
});
test('부피만 작고 한 변이 넘치는 박스 제외',()=>{
 assert.equal(recommend(['50','1','1'],0,[{id:'cube',size:[10,10,10]}]).matches.length,0);
});
test('모든 여유 선택값과 잘못된 여유 검증',()=>{
 for(const p of [0,1,2,3,5])assert.deepEqual(recommend(['1','2','3'],p,boxes).needed,[1+p,2+p,3+p]);
 assert.ok(recommend(['1','2','3'],4,boxes).errors.length);
});
