// 기능 확인용 예시 내부 규격입니다. 실제 상품·우체국 규격이 아닙니다.
globalThis.BOXFIT_BOXES = [
 ['미니',12,9,6],['스몰',16,12,8],['슬림',24,16,6],['컴팩트',20,15,10],
 ['데일리',22,17,12],['스탠다드',25,20,15],['큐브',22,22,22],['와이드',32,24,12],
 ['미디엄',30,25,20],['라지',40,30,25],['롱',60,20,20],['엑스트라',50,40,35],['빅',60,50,40]
].map(([name,...size],i)=>({id:`B${String(i+1).padStart(2,'0')}`,name,size}));

// 판매처 상품의 내부 치수(cm)와 판매 단위입니다.
globalThis.BOXFIT_PRODUCTS = [
 { id: 'P02', name: '박스가 우체국 2호 크기', size: [27, 18, 15], quantity: 20, productId: '9618400320', source: 'product' },
 { id: 'P03', name: '박스가 우체국 3호 크기', size: [34, 25, 21], quantity: 1, productId: '9618455300', source: 'product' },
 { id: 'P05', name: '박스가 우체국 5호 크기', size: [48, 38, 34], quantity: 3, productId: '6220912207', source: 'product' }
];
