/**
 * @file foundation-regression.ts
 * This suite checks for regressions in "foundational" NPM packages by
 * installing their dependencies and running their test suites.
 * By foundational, we me mean packages that may or may not be popular
 */

import { installAndTest, steps } from '../lib'

export default installAndTest('foundation regression', {
    express: {
        repository: 'https://github.com/expressjs/express',
        ref: 'master',
        test: `--bun run test`,
        failing: true,
        // takes like an hour b/c of bug in setTimeout or something
        skip: true,
        // test: 'test test/*.js',
        // preload: [
        //     import.meta.require.resolve('@shim/mocha'),
        //     './test/support/env.js',
        // ],
    },
    fastify: {
        repository: 'https://github.com/fastify/fastify.git',
        test: steps.test.bun,
        failing: true,
    },
    koa: {
        repository: 'https://github.com/koajs/koa',
        ref: 'master',
        test: steps.test.bun,
    },
    hono: {
        repository: 'https://github.com/honojs/hono',
        test: 'test:bun',
    },
    elysia: {
        repository: 'https://github.com/elysiajs/elysia.git',
        postinstall: ({ bun }) => `${bun} run build`,
        test: steps.test.bun,
    },
    nestjs: {
        repository: 'https://github.com/nestjs/nest.git',
        ref: 'master',
        postinstall: ({ bun }) => `${bun} run build`,
        test: steps.test.bun,
        failing: true,
    },
    /**
     * it's got like 116m downloads
     * https://www.npmjs.com/package/minipass
     */
    minipass: {
        repository: 'https://github.com/isaacs/minipass',
        test: '--bun tap',
        failing: true,
    },

    // these guys use bun
    'graphql-tools': {
        repository: 'https://github.com/ardatan/graphql-tools',
        ref: 'master',
        test: 'test:bun',
        postinstall: ({ bun }) => `${bun} run build`,
        failing: true,
        skip: true, // hangs in CI
    },
    socks: {
        repository: 'https://github.com/JoshGlazebrook/socks',
        ref: 'master',
        failing: true,
        test: steps.test.bun,
        postinstall: ({ bun }) => `${bun} run build`,
        testEnv: {
            NODE_ENV: 'test',
        },
    },
    prisma: {
        repository: 'https://github.com/prisma/prisma',
        preinstall: ({ isLocal, bun }) =>
            isLocal ? undefined : `${bun} i -g pnpm`,
        install: 'pnpm i',
        postinstall: ({ bun }) => `pnpm i && ${bun} run build`,
        skip: true, // relies on gh actions. TODO: polyfill w buildkite env vars
    },
})
