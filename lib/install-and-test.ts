import assert from 'node:assert'
import fs from 'fs'
import type { Context, EcosystemSuite } from './test-suite'
import { TestCase, Step } from './test-suite'
import * as steps from './steps'
import type { Maybe } from './types'
import { tmpDirSync } from '../src/util'
import { join } from 'node:path'

type ContextData = {
    tmpdir?: string
}

interface Package extends Pick<TestCase.Options, 'failing' | 'skip'> {
    /**
     * URL to git repo. This gets cloned
     */
    repository: string
    /**
     * Ref to check out (branch name, commit, tag, etc).
     * @default "main"
     */
    ref?: string
    /**
     * How to run tests. "bun" is prepended implicitly.
     * @default "run test"
     */
    test?: string | string[]
    /**
     * Environment variables to set **only** for the test step
     */
    testEnv?: Record<string, string | undefined>
    install?: string | StepFactory
    /**
     * Run a step after `bun install`
     */
    postinstall?: StepFactory
    /**
     * Run a step before `bun install`
     */
    preinstall?: StepFactory
    /**
     * Preload scripts to include when testing. These get added into `bunfig.toml`.
     *
     * @see [Bun docs - `test.preload`](https://bun.sh/docs/runtime/bunfig#test-preload)
     */
    preload?: string | string[]
}

type StepFactory =
    | string
    | ((ctx: Context<ContextData>) => Maybe<string | Step>)
const maybeRunFactory = (
    ctx: Context,
    factory: Maybe<StepFactory>
): Maybe<string | Step> => {
    if (typeof factory === 'string') return factory
    if (factory == null) return undefined
    return factory(ctx)
}

/**
 * Create an ecosystem test suite that
 * 1. Checks out a repository
 * 2. Creates a `bunfig.toml` that symlinks `node` to `bun` and adds it to `$PATH`
 * 3. Installs dependencies (`bun install`)
 * 4. (Optionally) runs a postinstall step
 * 5. Runs all of its tests (`bun run test`)
 *
 * @param packages Packages to clone and test. Each one gets turned into a {@link TestCase}.
 */
export function installAndTest(
    name: string,
    packages: Record<string, Package>
): EcosystemSuite {
    return function doInstallAndTest(ctx) {
        const { bun } = ctx
        const defaultTestStep = `${bun} run test`

        const tmpdir =
            ctx.isLocal && ctx.runner == 'bun'
                ? tmpDirSync('bun-ecosystem-' + name)
                : undefined

        const cases = Object.entries(packages).reduce(
            (
                cases: TestCase[],
                [
                    packageName,
                    {
                        test,
                        testEnv,
                        repository,
                        ref = 'main',
                        preload,
                        // postinstall,
                        ...rest
                    },
                ]
            ) => {
                let testStep: string = defaultTestStep
                if (typeof test === 'string') {
                    assert(test.length, `test step cannot be empty`)
                    testStep = `${bun} ${test}`
                } else if (Array.isArray(test)) {
                    assert(test.length, `test step cannot be empty`)
                    assert.notEqual(test[0], 'bun')
                    const cleanTests = test.map(arg =>
                        arg.includes(' ') ? `"${arg}"` : arg
                    )
                    testStep = [bun, ...cleanTests].join(' ')
                }

                // bunfig.toml contents
                let bunfig = /* toml */ `[run]\nbun=true\n`
                if (preload) {
                    bunfig += '[test]\n'
                    if (Array.isArray(preload)) {
                        bunfig +=
                            'preload = [' +
                            preload.map(p => `\\"${p}\\"`).join(', ') +
                            ']\n'
                    } else {
                        bunfig += `preload = \\"${preload}\\"\n`
                    }
                }
                bunfig = bunfig.replaceAll('\n', '\\n')

                const preinstall = maybeRunFactory(ctx, rest.preinstall)
                const postinstall = maybeRunFactory(ctx, rest.postinstall)
                const install = Step.from(
                    maybeRunFactory(ctx, rest.install) ?? `${bun} install`,
                    {
                        cwd: packageName,
                    }
                )
                install.key = 'install-deps' // must be set after in case install() returns a Step

                let shimNodeStep: Step
                if (tmpdir) {
                    const nodepath = join(tmpdir, 'node')
                    shimNodeStep = Step.from(
                        [
                            `printf "#!/bin/bash\\n echo 'Test suite tried to use node!'; \\nexit 1" > ${nodepath}`,
                            `chmod +x ${nodepath}`,
                        ],
                        { name: 'Shim node binary', key: 'shim-node' }
                    )
                    const pathWithShimmedNodeBin = `${tmpdir}:${testEnv?.PATH ?? process.env.PATH}`
                    testEnv ??= {}
                    testEnv['PATH'] = pathWithShimmedNodeBin
                } else {
                    shimNodeStep = Step.from(['. ./.buildkite/shim-node.sh'], {
                        name: 'Shim node binary',
                        key: 'shim-node',
                    })
                }

                const testCase = TestCase.from(packageName, {
                    ...rest,
                    steps: [
                        steps.checkout({
                            packageName,
                            ref,
                            repository,
                            isLocal: ctx.isLocal,
                        }),
                        Step.from(`printf "${bunfig}" > bunfig.toml`, {
                            name: 'Create bunfig',
                            cwd: packageName,
                            key: 'create-bunfig',
                        }),
                        preinstall &&
                            Step.from(preinstall, {
                                cwd: packageName,
                                key: 'preinstall',
                            }),
                        install,
                        postinstall &&
                            Step.from(postinstall, {
                                cwd: packageName,
                                key: 'postinstall',
                            }),
                        shimNodeStep,

                        Step.from(testStep, {
                            cwd: packageName,
                            env: testEnv,
                            key: 'run-tests',
                        }),
                    ],
                })

                cases.push(testCase)
                return cases
            },
            [] as TestCase[]
        )

        return {
            name,
            cases,
            async beforeAll(ctx: Context<ContextData>) {
                const { isLocal, runner } = ctx
                if (isLocal && runner === 'bun') {
                    try {
                        await fs.promises.mkdir('repos', { recursive: true })
                    } catch (e) {
                        if (typeof e === 'object' && e != null && 'code' in e) {
                            const err = e as NodeJS.ErrnoException
                            if (err.code !== 'EEXIST') throw err
                        }
                    }
                    process.chdir('repos')
                }
            },
        }
    }
}
