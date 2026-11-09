const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createCustomBox,recommend}=require('../recommend.js');
require('../boxes.js');
const examples=globalThis.BOXFIT_BOXES;

function custom(name,size,id='U1'){
 const result=createCustomBox(name,size,id);
 assert.ok(!result.errors.some(Boolean),JSON.stringify(result.errors));
 assert.ok(result.box);
 return result.box;
}

test('내 박스 이름의 앞뒤 공백을 제거하고 소수 내부 규격과 출처를 보존한다',()=>{
 assert.deepEqual(custom('  내 배송 박스  ',['22.5','17.5','12.5']),{
  id:'U1',name:'내 배송 박스',size:[22.5,17.5,12.5],source:'custom'
 });
});

test('내 박스의 빈 이름과 60자를 넘는 이름을 거부한다',()=>{
 for(const name of ['', '   ', '가'.repeat(61)]){
  const r=createCustomBox(name,['22','17','12'],'U1');
  assert.ok(r.errors[0]);assert.equal(r.box,undefined);
 }
 assert.equal(custom('가'.repeat(60),['22','17','12']).name.length,60);
});

test('내 박스의 각 치수에 빈 값·0·음수·문자·무한대·잘못된 소수를 허용하지 않는다',()=>{
 for(let axis=0;axis<3;axis++){
  for(const value of ['', ' ', '0', '-1', 'abc', 'Infinity', '1e309', '1.2.3', '12cm']){
   const size=['22','17','12'];size[axis]=value;
   const r=createCustomBox('테스트',size,'U1');
   assert.ok(r.errors[axis+1],`${axis}: ${value}`);assert.equal(r.box,undefined);
  }
 }
});

test('내 박스 부피가 무한대나 0으로 계산되는 극단적인 크기를 거부한다',()=>{
 const huge='1'+'0'.repeat(200);
 const tiny='0.'+'0'.repeat(199)+'1';
 for(const size of [[huge,huge,huge],[tiny,tiny,tiny]]){
  const r=createCustomBox('너무 큰/작은 값',size,'U1');
  assert.ok(r.errors.some(Boolean));assert.equal(r.box,undefined);
 }
});

test('내 박스도 포장 여유를 각 축에 더한 뒤 회전해서 딱 맞게 넣는다',()=>{
 const box=custom('회전용 내 박스',['22','17','12']);
 const r=recommend(['10','20','15'],2,[box]);
 assert.equal(r.matches.length,1);
 assert.deepEqual(r.needed,[12,22,17]);
 assert.deepEqual(r.matches[0].order,[1,2,0]);
 assert.deepEqual(r.matches[0].oriented,[20,15,10]);
 assert.equal(r.matches[0].volume,4488);
 assert.equal(r.matches[0].source,'custom');
});

test('내 박스가 한 축에서 여유 포함 크기보다 작으면 추천하지 않는다',()=>{
 const box=custom('약간 작은 박스',['22','17','11.99']);
 assert.equal(recommend(['10','20','15'],2,[box]).matches.length,0);
});

test('예시 박스와 내 박스를 합쳐 부피 순으로 최대 3개 추천하고 출처를 유지한다',()=>{
 const box=custom('아주 작은 내 박스',['5','5','5']);
 const r=recommend(['1','1','1'],2,[...examples,box]);
 assert.equal(r.matches.length,3);
 assert.equal(r.matches[0].id,'U1');
 assert.equal(r.matches[0].source,'custom');
 assert.equal(r.matches[1].id,'B01');
 assert.notEqual(r.matches[1].source,'custom');
 assert.ok(r.matches.every((b,i,list)=>!i||list[i-1].volume<=b.volume));
});

test('특수문자가 들어간 박스 이름은 데이터 그대로 유지된다',()=>{
 const name='<img src=x onerror=alert(1)> & "내 박스"';
 const box=custom(name,['22','17','12']);
 assert.equal(box.name,name);
 assert.equal(recommend(['20','15','10'],2,[box]).matches[0].name,name);
});

test('저장 후 지수 표기가 되는 소수·큰 숫자도 복원하고 직접 입력한 지수 문자열은 거부한다',()=>{
 for(const dimensions of [['.0000001','10','10'],['1000000000000000000000','1','1']]){
  const original=custom('저장할 박스',dimensions);
  const stored=JSON.parse(JSON.stringify({name:original.name,size:original.size}));
  const restored=createCustomBox(stored.name,stored.size,'U2');
  assert.ok(!restored.errors.some(Boolean),JSON.stringify(restored.errors));
  assert.deepEqual(restored.box.size,original.size);
  assert.equal(restored.box.source,'custom');
 }
 for(const exponent of ['1e-7','1e+21']){
  const r=createCustomBox('직접 입력',[exponent,'10','10'],'U1');
  assert.ok(r.errors[1]);assert.equal(r.box,undefined);
 }
});


test('상위 3개 밖에 있는 내 박스도 전체 추천 후보에 포함된다',()=>{
 const box=custom('테스트 박스',['30','25','20']);
 const r=recommend(['1','1','1'],2,[...examples,box]);
 assert.equal(r.matches.length,3);
 assert.ok(!r.matches.some(b=>b.id===box.id));
 assert.ok(r.candidates.some(b=>b.id===box.id));
 const exact=recommend(['28','23','18'],2,[...examples,box]);
 assert.ok(exact.candidates.some(b=>b.id===box.id));
});
