import assert from 'node:assert'
import fs from 'fs'
import type { Context, EcosystemSuite } from './test-suite'
import { TestCase, Step } from './test-suite'
import * as steps from './steps'

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
    /**
     * Run a step after `bun install`
     */
    postinstall?: (ctx: Context) => string | Step
    /**
     * Preload scripts to include when testing. These get added into `bunfig.toml`.
     *
     * @see [Bun docs - `test.preload`](https://bun.sh/docs/runtime/bunfig#test-preload)
     */
    preload?: string | string[]
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
                        postinstall,
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
                        bunfig += `preload = \\"${preload}\\"`
                    }
                }

                // const steps =
                const testCase = TestCase.from(packageName, {
                    ...rest,
                    steps: [
                        steps.checkout({ packageName, ref, repository }),
                        Step.from(`echo "${bunfig}" > bunfig.toml`, {
                            name: 'Create bunfig',
                            cwd: packageName,
                            key: 'create-bunfig',
                        }),
                        Step.from(`${bun} install`, {
                            cwd: packageName,
                            key: 'install-deps',
                        }),
                        postinstall &&
                            Step.from(postinstall(ctx), {
                                cwd: packageName,
                                key: 'postinstall',
                            }),

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
            async beforeAll({ isLocal }: Context) {
                if (isLocal) {
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
