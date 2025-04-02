/**
 * @file foundation-regression.ts
 * This suite checks for regressions in "foundational" NPM packages by
 * installing their dependencies and running their test suites.
 * By foundational, we me mean packages that may or may not be popular
 */

import { installAndTest } from '../lib'

export default installAndTest('foundation regression', {
    /**
     * it's got like 116m downloads
     * https://www.npmjs.com/package/minipass
     */
    minipass: {
        repository: 'https://github.com/isaacs/minipass',
        test: '--bun tap',
        failing: true,
    },
    express: {
        repository: 'https://github.com/expressjs/express',
        ref: 'master',
        test: `--bun run test`,
        failing: true,
        // test: 'test test/*.js',
        // preload: [
        //     import.meta.require.resolve('@shim/mocha'),
        //     './test/support/env.js',
        // ],
    },
    elysia: {
        repository: 'https://github.com/elysiajs/elysia.git',
        postinstall: ({ bun }) => `${bun} run build`,
    },

    // these guys use bun
    'graphql-tools': {
        repository: 'https://github.com/ardatan/graphql-tools',
        ref: 'master',
        test: 'test:bun',
        postinstall: ({ bun }) => `${bun} run build`,
        failing: true,
    },
    hono: {
        repository: 'https://github.com/honojs/hono',
        test: 'test:bun',
    },
    socks: {
        repository: 'https://github.com/JoshGlazebrook/socks',
        ref: 'master',
        failing: true,
        test: `test`,
        postinstall: ({ bun }) => `${bun} run build`,
        testEnv: {
            NODE_ENV: 'test',
        },
    },
})
