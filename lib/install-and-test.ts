import assert from 'node:assert'
import fs from 'fs'
import type { TestSuite, Context } from "./test-suite"
import { TestCase, Step } from "./test-suite"

interface Package {
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
    preload?: string | string[]
}

export function installAndTest(packages: Record<string, Package>): TestSuite {
    const defaultTestStep = `bun run test`

    const cases = Object.entries(packages).reduce(
        (
            cases: TestCase[],
            [packageName, { test, repository, ref = 'main', preload }]
        ) => {
            let testStep: string = defaultTestStep
            if (typeof test === 'string') {
                assert(test.length, `test step cannot be empty`)
                testStep = `bun ${test}`
            } else if (Array.isArray(test)) {
                assert(test.length, `test step cannot be empty`)
                assert.notEqual(test[0], 'bun')
                const cleanTests = test.map(arg =>
                    arg.includes(' ') ? `"${arg}"` : arg
                )
                testStep = [`bun`, ...cleanTests].join(' ')
            }

            let bunfig = /* toml */ `[run]\nbun=true\n`;
            if (preload){ 
                    bunfig += '[test]\n'
                if (Array.isArray(preload)) {
                    bunfig += 'preload = [' + preload.map(p => `\\"${p}\\"`).join(', ') + ']\n'
                } else {
                    bunfig += `preload = \\"${preload}\\"`
                }
            }

            const testCase = TestCase.from(packageName, [
                Step.from(`
                    if [ -d ${packageName} ]; then
                        cd ${packageName}
                        git reset --hard ${ref}
                    else
                        git clone ${repository} --branch ${ref} --depth 1 --no-tags ${packageName}
                    fi
                    `),
                Step.from(`echo "${bunfig}" > bunfig.toml`, {
                    name: 'Create bunfig',
                    cwd: packageName,
                }),
                Step.from(`bun install`, { cwd: packageName }),
                Step.from(testStep, { cwd: packageName }),
            ])

            cases.push(testCase)
            return cases
        },
        [] as TestCase[]
    )

    return {
        cases,
        beforeAll({ isLocal }: Context) {
            if (isLocal) {
                try {
                    fs.mkdirSync('repos', { recursive: true })
                } catch (e) {
                    const err = e as NodeJS.ErrnoException
                    if (err.code !== 'EEXIST') throw err
                }
                process.chdir('repos')
            }
        },
    }
}
