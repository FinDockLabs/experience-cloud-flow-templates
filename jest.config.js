const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');

module.exports = {
    ...jestConfig,
    moduleNameMapper: {
        ...jestConfig.moduleNameMapper,
        '^lightning/flowSupport$': '<rootDir>/jest-mocks/lightning/flowSupport',
        '^cpm/flowVariableInput$': '<rootDir>/jest-mocks/cpm/flowVariableInput/flowVariableInput',
        '^cpm/flowFieldSet$': '<rootDir>/jest-mocks/cpm/flowFieldSet/flowFieldSet'
    },
    setupFilesAfterEnv: [
        ...(jestConfig.setupFilesAfterEnv || []),
        '<rootDir>/jest.setup.a11y.js'
    ],
    testTimeout: 15000
};
