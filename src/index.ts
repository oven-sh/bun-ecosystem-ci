import assert from 'assert'
import { Command } from 'commander'
import type { Context, TestCase } from '../lib'
import suites from '../suites'
import { pick } from './util'

const inheritEnvVarNames = ['PATH', 'CI', 'TTY', 'BUN_DEBUG_QUIET_LOGS', 'TERM']

const program = new Command()
program //
    .option('-b, --bun <bun>', 'Path to bun executable', 'bun')
    .option('-t, --test <test>', 'Filter by test name pattern')
    .parse(process.argv)
    .action(async function run(cmd) {
        console.log('Running test suites')
        const cwd = process.cwd()
        const { test: testFilter } = cmd
        for (const [key, createSuite] of Object.entries(suites)) {
            const localContext: Context = Object.freeze({
                isLocal: true,
                bun: cmd.bun,
            })

            const suite =
                typeof createSuite === 'function'
                    ? await createSuite(localContext)
                    : createSuite
            suite.name ??= key

            console.log('Running suite:', suite.name)
            try {
                await suite.beforeAll?.(localContext)
                for (const testCase of suite.cases) {
                    if (testFilter && !testCase.name.includes(testFilter)) {
                        continue
                    }
                    if (testCase.skip) {
                        console.log('Skipping test case:', testCase.name)
                        continue
                    }
                    console.log('Running test case:', testCase.name)
                    await runCase(testCase)
                }
            } finally {
                if (suite.afterAll) {
                    try {
                        await suite.afterAll(localContext)
                    } catch (e) {
                        const error = new Error(
                            `Test suite ${suite.name} failed in afterAll`
                        )
                        error.cause = e
                        console.error(e)
                    }
                }
                process.chdir(cwd)
            }
        }
    })

program.parse(process.argv)

async function runCase(testCase: TestCase): Promise<number> {
    for (const step of testCase.steps) {
        const { run, env: stepEnv, cwd, name } = step
        const env = Object.assign(
            pick(process.env, inheritEnvVarNames),
            testCase.env,
            stepEnv
        )
        assert(run.length > 0, 'Step must have at least one command')
        console.log('Step: ' + (name || `$ ${run[0]}`))
        const child = Bun.spawn(['bash'], {
            stdio: ['pipe', 'inherit', 'inherit'],
            cwd,
            env,
        })
        for (const cmd of run) {
            child.stdin.write(cmd + '\n')
        }
        child.stdin.end()

        const code = await child.exited
        if (code !== 0) {
            return code
        }
    }
    console.log(`${testCase.name} ran successfully`)

    return 0
}
