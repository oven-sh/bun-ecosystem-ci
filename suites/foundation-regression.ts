/**
 * @file foundation-regression.ts
 * This suite checks for regressions in "foundational" NPM packages by
 * installing their dependencies and running their test suites.
 * By foundational, we me mean packages that may or may not be popular
 */

import { installAndTest, steps } from '../lib'
import { usesPnpm } from '../lib/install-and-test'

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
        test: steps.test.bun('test-express'),
        failing: true,
    },
    koa: {
        repository: 'https://github.com/koajs/koa',
        ref: 'master',
        test: steps.test.bun('test-koa'),
    },
    hono: {
        repository: 'https://github.com/honojs/hono',
        test: 'test:bun',
    },
    elysia: {
        repository: 'https://github.com/elysiajs/elysia.git',
        postinstall: ({ bun }) => `${bun} run build`,
        test: steps.test.bun('test-elysia'),
    },
    nestjs: {
        repository: 'https://github.com/nestjs/nest.git',
        ref: 'master',
        postinstall: ({ bun }) => `${bun} run build`,
        test: steps.test.bun('test-nestjs'),
        failing: true,
    },
    nextjs: {
        repository: 'https://github.com/vercel/next.js',
        ref: 'canary',
        test: '--bun run test',
        postinstall: ({ bun }) => `${bun} run build`,
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
    'graphql-yoga': {
        repository: 'https://github.com/graphql-hive/graphql-yoga',
        ...usesPnpm(),
        test: steps.test.bun('test-graphql-yoga'),
    },
    socks: {
        repository: 'https://github.com/JoshGlazebrook/socks',
        ref: 'master',
        failing: true,
        test: steps.test.bun('test-socks'),
        postinstall: ({ bun }) => `${bun} run build`,
        testEnv: {
            NODE_ENV: 'test',
        },
    },
    prisma: {
        repository: 'https://github.com/prisma/prisma',
        ...usesPnpm(),
        skip: true, // relies on gh actions. TODO: polyfill w buildkite env vars
    },
    // hangs
    // 'date-fns': {
    //     repository: 'https://github.com/date-fns/date-fns',
    //     test: '--bun vitest',
    // }
    vitest: {
        repository: 'https://github.com/vitest-dev/vitest',
        ...usesPnpm(),
        test: '--bun run test',
    }
})
