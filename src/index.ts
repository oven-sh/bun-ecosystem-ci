import assert from 'assert'
import type { Context, TestCase } from '../lib'
import suites from '../suites'
import { pick } from './util'

const inheritEnvVarNames = ['PATH', 'CI', 'TTY', 'BUN_DEBUG_QUIET_LOGS', 'TERM']

for (const [key, createSuite] of Object.entries(suites)) {
    const localContext: Context = {
        isLocal: true,
    }

    const suite =
        typeof createSuite === 'function'
            ? await createSuite(localContext)
            : createSuite
    suite.name ??= key

    console.log('Running suite:', suite.name)
    try {
        await suite.beforeAll?.(localContext)
        for (const testCase of suite.cases) {
            console.log('Running test case:', testCase.name)
            await runCase(testCase)
        }
    } finally {
        await suite.afterAll?.(localContext)
    }
}

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
