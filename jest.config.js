module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        isolatedModules: true,
      },
    ],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  // Handle path aliases
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  // Fix the uuid module issue
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
  // Need to set NODE_ENV for tests
  setupFiles: ['<rootDir>/jest.setup.js'],
};
