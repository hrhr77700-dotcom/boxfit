'use strict';
const form=document.querySelector('#box-form');
const fields = ['width', 'depth', 'height'].map(id => document.getElementById(id));
const results = document.querySelector('#results');
const error = document.querySelector('#input-error');
const initial = results.innerHTML;
const customForm = document.querySelector('#custom-box-form');
const customDialog = document.querySelector('#custom-box-dialog');
const openCustomButton = document.querySelector('#open-custom-box');
const customFields = ['box-name', 'box-width', 'box-depth', 'box-height'].map(id => document.getElementById(id));
const customError = document.querySelector('#custom-error');
const customList = document.querySelector('#custom-box-list');
const customStatus = document.querySelector('#custom-status');
const storageNote = document.querySelector('#storage-note');
const storageKey = 'boxfit.custom-boxes.v1';
let customBoxes = [];
let nextId = 1;
let hasRecommendation = false;
const number = value => value.toLocaleString('ko-KR', { maximumSignificantDigits: 15 });
const size = values => values.map(number).join(' × ');
// User-entered names are text, including when rendered inside result templates.
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function clearErrors() {
  error.hidden = true;
  error.textContent = '';
  fields.forEach(field => field.removeAttribute('aria-invalid'));
}

function showRecommendations(focusError = true) {
  clearErrors();
  const result = BoxFit.recommend(fields.map(field => field.value), Number(form.elements.padding.value), [...BOXFIT_BOXES, ...customBoxes]);
  if (result.errors.some(Boolean)) {
    error.textContent = result.errors.filter(Boolean).join(' ');
    error.hidden = false;
    result.errors.forEach((message, i) => { if (message && fields[i]) fields[i].setAttribute('aria-invalid', 'true'); });
    results.innerHTML = '<div class="empty"><h3>입력한 크기를 확인해주세요</h3><p>올바른 크기를 입력하면 추천 결과가 표시돼요.</p></div>';
    if (focusError) fields.find(field => field.getAttribute('aria-invalid') === 'true')?.focus();
    return;
  }
  hasRecommendation = true;
  const summary = `<div class="needed"><span>여유를 포함한 필요 내부 크기</span><strong>${size(result.needed)} <small>cm</small></strong><span>입력한 가로 × 세로 × 높이 순서 · 여유 ${result.padding} cm</span></div>`;
  if (!result.matches.length) {
    results.innerHTML = summary + '<div class="empty no-match"><span aria-hidden="true">↗</span><h3>조금 더 큰 박스가 필요해요</h3><p>예시 박스와 내 박스 중에는 맞는 박스가 없어요.<br>위 크기 이상의 내부 공간을 가진 박스를 찾아주세요.<br>물건을 회전하면 치수 순서는 달라질 수 있어요.</p></div>';
    return;
  }
  results.innerHTML = summary + `<p class="count">맞는 박스 <strong>${result.matches.length}개</strong>를 골랐어요 <span>내부 가로 × 세로 × 높이</span></p>` + result.matches.map((box, i) => `<article class="box-card ${i === 0 ? 'best' : ''}">
    <div class="card-top"><div><span class="rank">${String(i + 1).padStart(2, '0')}</span><h3>${escapeHTML(box.name)}</h3></div>${i === 0 ? '<span class="badge">가장 작은 박스</span>' : ''}</div>
    <span class="source-tag ${box.source === 'custom' ? 'custom-source' : ''}">${box.source === 'custom' ? '내 박스' : '예시 박스'}</span>
    <div class="box-size">${size(box.size)} <small>cm</small></div><p class="volume">내부 부피 <strong>${number(box.volume)} cm³</strong></p>
    <div class="orientation"><span aria-hidden="true">↻</span><p>넣는 방향 <strong>${size(box.oriented)} cm</strong><br><span>박스 가로 ← 물건 ${BoxFit.labels[box.order[0]]} · 세로 ← ${BoxFit.labels[box.order[1]]} · 높이 ← ${BoxFit.labels[box.order[2]]}</span></p></div>
  </article>`).join('') + '<p class="result-note">넣는 방향은 물건 원래 크기 기준이며, 포장 여유도 함께 확인했어요.</p>';
}

form.addEventListener('submit', event => { event.preventDefault(); showRecommendations(); });
document.querySelector('#example').addEventListener('click', () => {
  [20, 15, 10].forEach((value, i) => { fields[i].value = value; });
  form.elements.padding.value = '2';
  showRecommendations();
});
form.addEventListener('reset', () => { clearErrors(); results.innerHTML = initial; hasRecommendation = false; });
form.addEventListener('input', clearErrors);

function clearCustomErrors() {
  customError.hidden = true;
  customError.textContent = '';
  customFields.forEach(field => field.removeAttribute('aria-invalid'));
}
function openCustomDialog() {
  customForm.reset();
  clearCustomErrors();
  if (typeof customDialog.showModal === 'function') customDialog.showModal();
  else customDialog.setAttribute('open', '');
  customFields[0].focus();
}
function closeCustomDialog() {
  if (typeof customDialog.close === 'function') customDialog.close();
  else customDialog.removeAttribute('open');
  openCustomButton.focus({ preventScroll: true });
}
openCustomButton.addEventListener('click', openCustomDialog);
document.querySelector('#cancel-custom-box').addEventListener('click', closeCustomDialog);
document.querySelector('#close-custom-box').addEventListener('click', closeCustomDialog);
customDialog.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); closeCustomDialog(); }
});
function renderCustomBoxes() {
  document.querySelector('#custom-count').textContent = `${customBoxes.length}개`;
  customList.innerHTML = customBoxes.length ? customBoxes.map(box => `<li><div><span class="source-tag custom-source">내 박스</span><strong>${escapeHTML(box.name)}</strong><span class="custom-size">안쪽 ${size(box.size)} cm</span></div><button type="button" data-remove="${box.id}" aria-label="${escapeHTML(box.name)} 삭제">삭제</button></li>`).join('') : '<li class="custom-empty">아직 추가한 박스가 없어요.</li>';
}
function saveCustomBoxes() {
  try {
    const serialized = JSON.stringify(customBoxes.map(({ name, size }) => ({ name, size })));
    localStorage.setItem(storageKey, serialized);
    if (localStorage.getItem(storageKey) !== serialized) throw new Error('Storage did not retain boxes');
    storageNote.textContent = '내 박스는 이 브라우저에 저장돼요. 파일 위치나 브라우저가 바뀌면 목록이 달라질 수 있어요.';
  } catch {
    storageNote.textContent = '이 브라우저에서는 저장할 수 없어 내 박스가 현재 창에서만 유지돼요. 파일을 닫거나 새로고침하면 사라질 수 있어요.';
  }
}
function loadCustomBoxes() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      const entries = JSON.parse(saved);
      if (!Array.isArray(entries)) throw new Error('Invalid saved boxes');
      for (const entry of entries) {
        if (!entry || typeof entry.name !== 'string' || !Array.isArray(entry.size) || entry.size.length !== 3) throw new Error('Invalid saved box');
        const result = BoxFit.createCustomBox(entry.name, entry.size, `U${nextId++}`);
        if (result.errors.some(Boolean)) throw new Error('Invalid saved box dimensions');
        customBoxes.push(result.box);
      }
    }
  } catch {
    customBoxes = [];
    storageNote.textContent = '저장된 내 박스를 불러오지 못했어요. 새로 추가한 박스는 지금 바로 사용할 수 있어요.';
  }
  renderCustomBoxes();
}
customForm.addEventListener('submit', event => {
  event.preventDefault();
  clearCustomErrors();
  customStatus.textContent = '';
  const result = BoxFit.createCustomBox(customFields[0].value, customFields.slice(1).map(field => field.value), `U${nextId}`);
  if (result.errors.some(Boolean)) {
    customError.textContent = result.errors.filter(Boolean).join(' ');
    customError.hidden = false;
    result.errors.forEach((message, i) => { if (message) customFields[i].setAttribute('aria-invalid', 'true'); });
    customFields.find(field => field.getAttribute('aria-invalid') === 'true')?.focus();
    return;
  }
  nextId++;
  customBoxes.push(result.box);
  saveCustomBoxes();
  renderCustomBoxes();
  customForm.reset();
  closeCustomDialog();
  customStatus.textContent = `‘${result.box.name}’ (${size(result.box.size)} cm)를 추가했어요. 내 박스 목록과 추천 후보에 반영했습니다.`;
  const inputIsValid = !BoxFit.recommend(fields.map(field => field.value), Number(form.elements.padding.value), []).errors.some(Boolean);
  if (hasRecommendation || inputIsValid) showRecommendations(false);
  customStatus.focus({ preventScroll: true });
  customStatus.scrollIntoView({ block: 'nearest' });
});
customForm.addEventListener('input', clearCustomErrors);
customList.addEventListener('click', event => {
  const button = event.target.closest('button[data-remove]');
  if (!button) return;
  const removed = customBoxes.find(box => box.id === button.dataset.remove);
  customBoxes = customBoxes.filter(box => box.id !== button.dataset.remove);
  saveCustomBoxes();
  renderCustomBoxes();
  customStatus.textContent = `‘${removed.name}’ 박스를 삭제했어요.`;
  if (hasRecommendation) showRecommendations(false);
  openCustomButton.focus({ preventScroll: true });
});
loadCustomBoxes();
