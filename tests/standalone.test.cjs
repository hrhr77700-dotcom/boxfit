const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('단일 HTML에 스타일과 모든 스크립트가 포함되고 외부 의존성이 없다',()=>{
 assert.match(html,/<style>/);
 assert.doesNotMatch(html,/<script\b[^>]*\bsrc\s*=/i);
 assert.doesNotMatch(html,/<link\b[^>]*\bhref\s*=/i);
 assert.doesNotMatch(html,/\bfetch\s*\(|@import\b|url\s*\(/i);
 const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
 for(const file of ['boxes.js','recommend.js','app.js'])assert.ok(script.includes(fs.readFileSync(path.join(__dirname,'..',file),'utf8')),`${file} 원본과 일치`);
 const context={};vm.createContext(context);
 // UI event handling is verified in Chromium; execute the embedded data and engine here.
 vm.runInContext(script.split("'use strict';\nconst form=")[0],context);
 const r=context.BoxFit.recommend(['20','15','10'],2,context.BOXFIT_BOXES);
 assert.equal(r.matches[0].name,'데일리');assert.equal(r.matches[0].volume,4488);
});
