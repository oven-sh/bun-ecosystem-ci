import assert from 'assert'
import path from 'path'
import { Command } from 'commander'
import {
    TestSuite,
    type Context,
    type EcosystemSuite,
    type TestCase,
} from '../lib'
import suites from '../suites'
import { pick, toSnakeCase } from './util'
import { createPipeline } from './buildkite/render'
import { renderSuite as renderSuiteAsBashScript } from './shell'
import { version } from '../package.json'

const inheritEnvVarNames = ['PATH', 'CI', 'TTY', 'BUN_DEBUG_QUIET_LOGS', 'TERM']

export default function main(argv: string[]): void {
    const program = new Command().name('ecosystem-ci').version(version)

    const bunOpt = program
        .createOption('-b, --bun <bun>', 'Path to bun executable')
        .default('bun')

    program
        .command('render')
        .alias('r')
        .description('Render a test suite into a CI pipeline')
        .addOption(bunOpt)
        .addOption(
            program
                .createOption(
                    '-f, --format <format>',
                    'Format to render the pipeline in'
                )
                .choices(['buildkite', 'shell'])
                .default('buildkite')
        )
        .option(
            '-o, --output <output>',
            'Output directory relative to cwd. Defaults to "."'
        )
        .option(
            '-s, --suite <suite>',
            'Render a single suite. Defaults to all suites.'
        )
        .action(async function render(cmd): Promise<void> {
            const { suite: suiteName, output, format, bun } = cmd

            if (!bun) program.error('Bun executable cannot be empty.')
            const outdir = output ? path.resolve(output) : process.cwd()

            if (suiteName) {
                let suite = suites[suiteName]
                if (!suite) {
                    for (const testSuite of Object.values(suites)) {
                        if (testSuite.name === suiteName) {
                            suite = testSuite
                            break
                        }
                    }
                }
                if (!suite) program.error(`Unknown suite: ${suiteName}`)
                await renderSuite(suite, {
                    output: outdir,
                    format,
                    bun,
                    suiteKey: suiteName,
                })
            } else {
                for (const [key, suite] of Object.entries(suites)) {
                    renderSuite(suite, {
                        suiteKey: key,
                        output: outdir,
                        format,
                        bun,
                    })
                }
            }
        })

    program
        .command('test', { isDefault: true })
        .alias('t')
        .description('Run test suites locally')
        .option('-t, --test <test>', 'Filter by test name pattern')
        .addOption(bunOpt)
        .action(async function run(cmd): Promise<void> {
            console.log('Running test suites')
            const cwd = process.cwd()
            const { test: testFilter, bun } = cmd
            if (!bun) program.error('Bun executable cannot be empty.')

            await runAllTests({ cwd, bun, testFilter })
        })

    program.parse(argv)
}

interface RenderOptions {
    output: string
    format: 'buildkite' | 'shell'
    bun: string
    suiteKey?: string
}
async function renderSuite(
    suite: EcosystemSuite,
    options: RenderOptions
): Promise<void> {
    const testSuite = await TestSuite.reify(suite, {
        isLocal: false,
        bun: options.bun,
    })
    const name = testSuite.name || options.suiteKey
    assert(name)
    let absoluteFilepath: string

    switch (options.format) {
        case 'buildkite': {
            const filename = toSnakeCase(name) + '.yml'
            absoluteFilepath = path.join(options.output, filename)
            const pipeline = await createPipeline(suite)
            await Bun.write(absoluteFilepath, pipeline.toYAML())
            break
        }
        case 'shell': {
            const filename = toSnakeCase(name) + '.sh'
            absoluteFilepath = path.join(options.output, filename)
            const testSuite =
                typeof suite === 'function'
                    ? await suite({ isLocal: false, bun: options.bun })
                    : suite
            const script = renderSuiteAsBashScript(testSuite).join('\n')
            await Bun.write(absoluteFilepath, script)
            break
        }
        default:
            throw new TypeError(`Unknown CI format: ${options.format}`)
    }
    console.log(
        `Saved pipeline to '${path.relative(process.cwd(), absoluteFilepath)}'`
    )
}

interface RunTestOptions {
    cwd: string
    bun: string
    testFilter?: string
}

/**
 * Local test runner.
 */
async function runAllTests({
    cwd,
    bun,
    testFilter,
}: RunTestOptions): Promise<void> {
    for (const [key, createSuite] of Object.entries(suites)) {
        const localContext: Readonly<Context> = Object.freeze({
            isLocal: true,
            bun,
        })

        // const suite =
        //     typeof createSuite === 'function'
        //         ? await createSuite(localContext)
        //         : createSuite
        const suite = await TestSuite.reify(createSuite, localContext)
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
