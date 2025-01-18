/**
 * @file foundation-regression.ts
 * This suite checks for regressions in "foundational" NPM packages by
 * installing their dependencies and running their test suites.
 * By foundational, we me mean packages that may or may not be popular
 */

import { installAndTest } from '../lib'

export default installAndTest({
    /**
     * it's got like 116m downloads
     * https://www.npmjs.com/package/minipass
     */
    // minipass: {
    //     repository: 'https://github.com/isaacs/minipass',
    //     test: '--bun tap',
    // },
    express: {
        repository: 'https://github.com/expressjs/express',
        ref: 'master',
        test: 'test test/*.js',
        preload: [
            import.meta.require.resolve('@shim/mocha'),
            './test/support/env.js',
        ], 
    },
    elysia: {
        repository: 'https://github.com/elysiajs/elysia.git',
        postinstall: ({ bun }) => `${bun} run build`
    }
})
