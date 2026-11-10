const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recommend } = require('../recommend.js');

test('남는 공간은 물건 크기를 뺀 양쪽 합계이며 포장 여유를 포함한다', () => {
  const box = { id: 'P02', size: [27, 18, 15] };
  const result = recommend(['20', '15', '10'], 2, [box]);
  assert.deepEqual(result.matches[0].remaining, [7, 3, 5]);
  assert.equal(result.matches[0].padding, 2);
  assert.equal(box.remaining, undefined);
});

test('남는 공간의 각 축은 회전 후 박스 방향을 따른다', () => {
  const result = recommend(['10', '20', '15'], 2, [{ id: 'P02', size: [27, 18, 15] }]);
  assert.deepEqual(result.matches[0].oriented, [20, 15, 10]);
  assert.deepEqual(result.matches[0].remaining, [7, 3, 5]);
});

test('포장 여유를 포함해 딱 맞는 박스의 남는 공간은 각 축의 여유와 같다', () => {
  const box = { id: 'U1', size: [30, 25, 20] };
  assert.deepEqual(recommend(['18', '28', '23'], 2, [box]).matches[0].remaining, [2, 2, 2]);
  assert.deepEqual(recommend(['30', '25', '20'], 0, [box]).matches[0].remaining, [0, 0, 0]);
});

test('소수 오차로 허용된 맞춤에서도 남는 공간이 음수가 되지 않는다', () => {
  const result = recommend([0.1 + 0.2, 0.2, 0.1], 0, [{ id: 'U1', size: [0.3, 0.2, 0.1] }]);
  assert.deepEqual(result.matches[0].remaining, [0, 0, 0]);
});
