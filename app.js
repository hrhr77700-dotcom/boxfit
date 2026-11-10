'use strict';
const form=document.querySelector('#box-form');
const fields = ['width', 'depth', 'height'].map(id => document.getElementById(id));
const results = document.querySelector('#results');
const error = document.querySelector('#input-error');
const initial = results.innerHTML;
const resultFilters = document.querySelector('#result-filters');
const scopeAll = document.querySelector('#scope-all');
const scopeCustom = document.querySelector('#scope-custom');
const quantityAll = document.querySelector('#quantity-all');
const quantitySingle = document.querySelector('#quantity-single');
const quantityFilter = document.querySelector('#quantity-filter');
const resultDescription = document.querySelector('#result-description');
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

function renderBoxCard(box, i) {
  return `<article class="box-card ${i === 0 ? 'best' : ''}">
    <div class="card-top"><div><span class="rank">${String(i + 1).padStart(2, '0')}</span><h3>${escapeHTML(box.name)}</h3></div>${i === 0 ? '<span class="badge">가장 작은 박스</span>' : ''}</div>
    <span class="source-tag ${box.source === 'custom' ? 'custom-source' : ''}">${box.source === 'product' ? '판매 상품' : box.source === 'custom' ? '내 박스' : '예시 규격'}</span>
    <div class="box-size">${size(box.size)} <small>cm</small></div><p class="volume">내부 부피 <strong>${number(box.volume)} cm³</strong></p>
    <div class="orientation"><span aria-hidden="true">↻</span><p>넣는 방향 <strong>${size(box.oriented)} cm</strong><br><span>박스 가로 ← 물건 ${BoxFit.labels[box.order[0]]} · 세로 ← ${BoxFit.labels[box.order[1]]} · 높이 ← ${BoxFit.labels[box.order[2]]}</span></p></div>
    <div class="remaining-space">
      <p>물건을 넣고 남는 공간</p>
      <dl>${box.remaining.map((gap, axis) => `<div><dt>${BoxFit.labels[axis]}</dt><dd>${number(gap)} <span>cm</span></dd></div>`).join('')}</dl>
      <small>박스 각 방향의 양쪽 합계 · 선택한 포장 여유 ${number(box.padding)} cm씩 포함</small>
    </div>
    ${box.source === 'product' ? `<p class="volume">판매 단위 <strong>${box.quantity}장</strong> · <a href="https://smartstore.naver.com/boxga/products/${box.productId}" target="_blank" rel="noopener noreferrer">박스가 상품 보기</a></p>` : ''}
  </article>`;
}

function showRecommendations(focusError = true) {
  clearErrors();
  const dimensions = fields.map(field => field.value);
  const padding = Number(form.elements.padding.value);
  const onlyCustom = scopeCustom.checked;
  const boxes = onlyCustom ? customBoxes : [...BOXFIT_BOXES, ...customBoxes];
  const result = BoxFit.recommend(dimensions, padding, boxes);
  if (result.errors.some(Boolean)) {
    error.textContent = result.errors.filter(Boolean).join(' ');
    error.hidden = false;
    result.errors.forEach((message, i) => { if (message && fields[i]) fields[i].setAttribute('aria-invalid', 'true'); });
    results.innerHTML = '<div class="empty"><h3>입력한 크기를 확인해주세요</h3><p>올바른 크기를 입력하면 추천 결과가 표시돼요.</p></div>';
    if (focusError) fields.find(field => field.getAttribute('aria-invalid') === 'true')?.focus();
    return;
  }
  hasRecommendation = true;
  const copyText = `박스 내부 크기 (가로 × 세로 × 높이): ${size(result.needed)} cm`;
  const summary = `<div class="needed"><span>여유를 포함한 필요 내부 크기</span><strong>${size(result.needed)} <small>cm</small></strong><span>입력한 가로 × 세로 × 높이 순서 · 여유 ${result.padding} cm</span>
    <button id="copy-needed-size" class="secondary" type="button">필요한 박스 크기 복사</button>
    <input id="needed-size-text" type="text" value="${escapeHTML(copyText)}" aria-label="복사할 박스 내부 크기" readonly hidden>
    <span id="copy-needed-status" role="status" hidden></span>
  </div>`;
  let boxSection;
  if (result.matches.length) {
    const title = onlyCustom ? '맞는 내 박스' : '맞는 예시 박스와 내 박스';
    boxSection = `<section aria-label="${title}"><p class="count">${title} <strong>${result.candidates.length}개</strong> 중 ${result.matches.length}개를 골랐어요 <span>내부 가로 × 세로 × 높이</span></p>` + result.matches.map(renderBoxCard).join('') + '</section>';
  } else if (onlyCustom && !customBoxes.length) {
    boxSection = '<div class="empty no-match"><h3>저장한 내 박스가 없어요</h3><p>가지고 있는 박스의 안쪽 크기를 추가하면<br>물건이 들어가는지 확인할 수 있어요.</p><button class="secondary" type="button" data-action="add-custom">내 박스 추가하기</button></div>';
  } else {
    const title = onlyCustom ? '내 박스 중에는 맞는 박스가 없어요' : '예시 박스와 내 박스 중에는 맞는 박스가 없어요';
    boxSection = `<div class="empty no-match"><h3>${title}</h3><p>위 필요 내부 크기 이상의 박스를 찾아주세요.<br>물건을 회전하면 치수 순서는 달라질 수 있어요.</p>${onlyCustom ? '<button class="secondary" type="button" data-action="show-all-boxes">전체 박스 보기</button>' : ''}</div>`;
  }

  let productSection = '';
  if (!onlyCustom) {
    const products = quantitySingle.checked ? BOXFIT_PRODUCTS.filter(box => box.quantity === 1) : BOXFIT_PRODUCTS;
    const matches = BoxFit.recommend(dimensions, padding, products).matches;
    const heading = quantitySingle.checked ? '1장 구매할 수 있는 박스' : '구매할 수 있는 박스';
    productSection = `<section aria-label="판매 상품 추천"><h3 class="count">${heading}</h3>`;
    if (matches.length) {
      productSection += matches.map(renderBoxCard).join('');
    } else {
      const title = quantitySingle.checked ? '맞는 1장 상품이 없어요' : '등록된 판매 상품 중에는 맞는 박스가 없어요';
      const bundlesFit = quantitySingle.checked && BoxFit.recommend(dimensions, padding, BOXFIT_PRODUCTS).matches.length > 0;
      productSection += `<div class="empty"><h3>${title}</h3><p>필요한 박스 크기를 복사해서 다른 상품을 찾아볼 수 있어요.</p>${bundlesFit ? '<button class="secondary" type="button" data-action="show-bundles">묶음 상품 보기</button>' : ''}</div>`;
    }
    productSection += '</section>';
  }
  results.innerHTML = summary + boxSection + productSection + '<p class="result-note">넣는 방향은 물건 원래 크기 기준이며, 포장 여유도 함께 확인했어요.</p>';
}

function updateFilters() {
  quantityFilter.hidden = scopeCustom.checked;
  quantityFilter.disabled = scopeCustom.checked;
  resultDescription.textContent = scopeCustom.checked
    ? '저장한 내 박스 중 물건이 들어가는 박스를 작은 순서로 최대 3개 추천해요.'
    : '예시 박스와 내 박스 중 작은 순서로 최대 3개를 추천하고, 맞는 판매 상품은 따로 보여드려요.';
  if (hasRecommendation) showRecommendations(false);
}
resultFilters.addEventListener('change', updateFilters);

results.addEventListener('click', async event => {
  const action = event.target.closest('button[data-action]')?.dataset.action;
  if (action === 'add-custom') {
    openCustomDialog();
    return;
  }
  if (action === 'show-all-boxes') {
    scopeAll.checked = true;
    updateFilters();
    scopeAll.focus();
    return;
  }
  if (action === 'show-bundles') {
    quantityAll.checked = true;
    updateFilters();
    quantityAll.focus();
    return;
  }
  const button = event.target.closest('#copy-needed-size');
  if (!button) return;

  const field = results.querySelector('#needed-size-text');
  const status = results.querySelector('#copy-needed-status');
  status.hidden = false;
  try {
    await navigator.clipboard.writeText(field.value);
    status.textContent = '필요한 박스 크기를 복사했어요.';
  } catch {
    field.hidden = false;
    field.focus();
    field.select();
    status.textContent = '선택된 내용을 복사해주세요. PC에서는 Ctrl+C를 누르면 돼요.';
  }
});

form.addEventListener('submit', event => { event.preventDefault(); showRecommendations(); });
document.querySelector('#example').addEventListener('click', () => {
  [20, 15, 10].forEach((value, i) => { fields[i].value = value; });
  form.elements.padding.value = '2';
  showRecommendations();
});
form.addEventListener('reset', () => {
  clearErrors();
  results.innerHTML = initial;
  hasRecommendation = false;
  scopeAll.checked = true;
  quantityAll.checked = true;
  updateFilters();
});
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
    storageNote.textContent = '브라우저 저장을 사용할 수 없어 현재 창에서만 유지됩니다. 파일을 닫거나 새로고침하면 사라질 수 있어요.';
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
    storageNote.textContent = '저장된 내 박스를 불러오지 못했습니다. 새로 추가한 박스는 현재 창에서만 유지됩니다.';
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

