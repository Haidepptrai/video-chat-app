const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/components/(.*)$": "<rootDir>/components/$1",
    "^@/context/(.*)$": "<rootDir>/context/$1",
    "^@/pages/(.*)$": "<rootDir>/pages/$1",
    "^@/src/(.*)$": "<rootDir>/src/$1",
    "^@/styles/(.*)$": "<rootDir>/styles/$1",
    "^@/public/(.*)$": "<rootDir>/public/$1",
  },
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
};

module.exports = createJestConfig(customJestConfig);
