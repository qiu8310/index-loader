module.exports = {
  roots: ['<rootDir>/src'],

  testEnvironment: 'node',

  testRegex: '(/__tests__/.*\\.(test|spec))\\.(ts|tsx)$',
  transform: {
    '^.+\\.tsx?$': require.resolve('ts-jest')
  },
  moduleFileExtensions: ['js', 'jsx', 'json', 'ts', 'tsx'],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'html'],
  // collectCoverageFrom: [
  //   "<rootDir>/src/**/*.{js,jsx,ts,tsx}"
  // ],
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/helper/'],
  coverageThreshold: {
    // with the following configuration jest will fail
    // if there is less than 90% branch, line, and function
    // coverage, or if there are more than 10 uncovered
    // statements:
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: -10
    }
  }
}
