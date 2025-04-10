import assert from 'assert'
import path from 'path'
import { Command } from 'commander'
import {
    Step,
    TestSuite,
    type Context,
    type EcosystemSuite,
    type TestCase,
} from '../lib'
import suites from '../suites'
import { pick, toSnakeCase } from './util'
import { PipelineFactory } from './buildkite/render'
import { renderSuite as renderSuiteAsBashScript } from './shell'
import { processJUnitReport } from './xml'
import { version } from '../package.json'

const inheritEnvVarNames = ['PATH', 'CI', 'TTY', 'BUN_DEBUG_QUIET_LOGS', 'TERM']

export default function main(argv: string[]): void {
    const program = new Command().name('ecosystem-ci').version(version)

    const bunOpt = program
        .createOption('-b, --bun <bun>', 'Path to bun executable')
        .default('bun')

    // `bun start render [options]
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
            'Output directory relative to cwd',
            'tmp'
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
                    for (const ecosystemSuite of Object.values(suites)) {
                        const testSuite = await TestSuite.reify(
                            ecosystemSuite,
                            { isLocal: false, bun, runner: format }
                        )
                        if (testSuite.name === suiteName) {
                            suite = testSuite
                            break
                        }
                    }
                }
                if (!suite) program.error(`Unknown suite: ${suiteName}`)
                await renderSuites([suite], {
                    output: outdir,
                    format,
                    bun,
                    suiteKey: suiteName,
                })
            } else {
                await renderSuites(Object.values(suites), {
                    output: outdir,
                    format,
                    bun,
                })
            }
        })

    /// `bun start process-report --report <path> --suite <name> [options]`
    program
        .command('process-report')
        .description('prepare a JUnit report (xml) for reporting to robobun')
        .addOption(bunOpt)
        .option('-r, --report <report>', 'Path to the report file')
        .option('-s, --suite <name>', 'Display name of the test suite')
        .action(async function processReport(cmd): Promise<void> {
            const { report: reportPath, suite: suiteName } = cmd
            if (!reportPath) program.error('Report file cannot be empty.')
            if (!suiteName) program.error('Suite name cannot be empty.')

            // todo: get version from `cmd.bun`?
            const newReport = await processJUnitReport(reportPath, suiteName, {
                bunVersion: Bun.version,
                ciJobUrl: process.env.BUILDKITE_BUILD_URL,
            })
            await Bun.write(reportPath, newReport)
            console.log(`Processed and saved report to '${reportPath}'`)
        })

    // `bun start [options]`
    // `bun start test [options]`
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
async function renderSuites(
    suites: EcosystemSuite[],
    options: RenderOptions
): Promise<void> {
    const ctx: Context = {
        isLocal: true,
        bun: options.bun,
        runner: options.format,
        data: undefined,
    }
    // let absoluteFilepath: string

    switch (options.format) {
        case 'buildkite': {
            const factory = new PipelineFactory(ctx)
            for (const suite of suites) {
                await factory.addTestSuite(suite)
            }
            const filename = 'ecosystem-ci.yml'
            const absoluteFilepath = path.join(options.output, filename)
            const relativeFilepath = path.relative(
                process.cwd(),
                absoluteFilepath
            )
            await Bun.write(absoluteFilepath, factory.toYAML())
            console.log(`Saved pipeline to '${relativeFilepath}'`)
            break
        }

        case 'shell': {
            for (const suite of suites) {
                const testSuite = await TestSuite.reify(suite, ctx)
                const name = testSuite.name || options.suiteKey
                assert(name)
                const filename = toSnakeCase(name) + '.sh'
                const absoluteFilepath = path.join(options.output, filename)
                const relativeFilepath = path.relative(
                    process.cwd(),
                    absoluteFilepath
                )
                const script = renderSuiteAsBashScript(testSuite).join('\n')
                await Bun.write(absoluteFilepath, script)
                console.log(`Saved pipeline to '${relativeFilepath}'`)
            }
            break
        }
        default:
            throw new TypeError(`Unknown CI format: ${options.format}`)
    }
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
        const localContext: Readonly<Context> = {
            isLocal: true,
            bun,
            runner: 'bun',
            data: undefined,
        }

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
        Step.validate(step)
        const { run, env: stepEnv, cwd, name, timeout } = step
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
            timeout,
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
