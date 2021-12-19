const inputCheck = require('../utils/inputCheck');

test('inputCheck() returns null when all properties exist', () => {
  const obj = {name: 'alice'};

  expect(inputCheck(obj, 'name')).toBe(null);
});