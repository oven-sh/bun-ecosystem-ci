/**
 * @file foundation-regression.ts
 * This suite checks for regressions in "foundational" NPM packages by
 * installing their dependencies and running their test suites.
 * By foundational, we me mean packages that may or may not be popular
 */

import type { Context, TestSuite } from '../lib'
import { TestCase, Step } from '../lib'
import fs from 'node:fs'
import assert from 'assert'

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
}

/**
 * Looking to add a new test? add it here.
 */
const packages: Record<string, Package> = {
    /**
     * https://www.npmjs.com/package/minipass?activeTab=readme
     */
    minipass: {
        repository: 'https://github.com/isaacs/minipass',
    },
}

export default function foundationRegression({ isLocal }: Context): TestSuite {
    const defaultTestStep = `bun run test`

    const cases = Object.entries(packages).reduce(
        (
            cases: TestCase[],
            [packageName, { test, repository, ref = 'main' }]
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

            const testCase = TestCase.from(packageName, [
                Step.from(`
                    if [ -d ${packageName} ]; then
                        cd ${packageName}
                        git checkout ${ref} --force
                    else
                        git clone ${repository} --branch ${ref} --depth 1 --no-tags ${packageName}
                    fi
                    `),
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
        beforeAll({ isLocal }) {
            if (isLocal) {
                try {
                    fs.mkdirSync('repos', { recursive: true })
                } catch (e) {
                    const err = e as NodeJS.ErrnoException
                    if (err.code !== 'EEXIST') throw err
                }
                process.chdir('repos')
            }
        }
    }
}
