module.exports = {
  roots: ['./'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testEnvironment: 'node',
  moduleNameMapper: {
    'congestion-charges.json': '<rootDir>/testUtils/__mocks__/charges.json',
    'tax-rules.json': '<rootDir>/testUtils/__mocks__/rules.json'
  }
};
