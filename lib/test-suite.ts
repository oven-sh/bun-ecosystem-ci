import type { Maybe } from './types'

/**
 * Test suites have similar checks over a bunch of cases. Each case normally
 * corresponds to a single NPM package.
 *
 * These types are designed to be mappable to both `bun test` and
 * buildkite.
 * - {@link TestSuite} -> workflow
 * - {@link TestCase} -> job
 * - {@link Step} -> step lol
 */
export interface Context {
    /**
     * Are we running tests locally or in CI?
     */
    isLocal: boolean
    /**
     * Name of bun binary. Use this instead of hardcoding `'bun'` into steps.
     */
    bun: string
}

export type EcosystemSuite =
    | TestSuite
    | ((context: Readonly<Context>) => TestSuite | Promise<TestSuite>)

export interface TestSuite {
    name?: string
    cases: TestCase[]
    beforeAll?: (context: Readonly<Context>) => void | Promise<void>
    afterAll?: (context: Readonly<Context>) => void | Promise<void>
}

export interface TestCase {
    /**
     * Display name of the test case.
     */
    name: string
    steps: Step[]
    /**
     * Default working directory for all {@link Step steps}. Steps may
     * individually override this.
     *
     * @default process.cwd()
     */
    cwd?: string
    /**
     * This case is currently not passing.
     *
     * Test cases marked as failing that actually pass will fail (to force you
     * to update `failing` to `false`).
     * @default false
     */
    failing: boolean
    /**
     * Do not run this test case. Takes precedence over {@link failing}.
     * @default false
     */
    skip: boolean
    /**
     * Environment variables to set for each step.
     *
     * Overrides existing values in {@link process.env}
     */
    env?: Record<string, string | undefined>
}
export namespace TestCase {
    export interface Options extends Partial<Omit<TestCase, 'name' | 'steps'>> {
        /**
         * The steps taken by this test case. Steps are normalized with {@link Step.from}.
         */
        steps: Maybe<string | Step>[]
    }

    /**
     * Create a test case that runs a series of steps.
     *
     * @param name Name of the test case
     * @param steps Steps to run. Strings are treated as shell commands.
     * @returns A test case
     */
    export function from(name: string, steps: Maybe<string | Step>[]): TestCase
    /**
     * Create a test case configured with options.
     *
     * @param name Name of the test case
     * @param testCase Options for the test case
     * @returns A test case
     */
    export function from(name: string, testCase: Options): TestCase
    export function from(
        name: string,
        stepsOrOptions: Options | Maybe<string | Step>[]
    ): TestCase {
        const {
            steps,
            cwd,
            env,
            failing = false,
            skip = false,
        } = Array.isArray(stepsOrOptions)
                ? { steps: stepsOrOptions }
                : stepsOrOptions

        return {
            name,
            steps: steps
                .filter(falsey)
                .map(step =>
                    typeof step === 'string' ? Step.from(step) : step
                ),
            cwd,
            env,
            failing,
            skip,
        }
    }

    /** Filter falsey values */
    const falsey = <T>(
        value: T
    ): value is Exclude<T, undefined | null | false | 0 | ''> => Boolean(value)
}

export interface Step {
    name?: string
    /**
     * Each line is a shell command to run
     */
    run: string[]
    /**
     * Environment variables to set for this step.
     *
     * Overrides existing values in {@link process.env} and {@link TestCase.env}
     */
    env?: Record<string, string | undefined>
    /**
     * Current working directory to use when running commands for this step.
     */
    cwd?: string
}
export namespace Step {
    export type Options = Partial<Omit<Step, 'run'>>

    export function from(
        command: string | string[] | Step,
        rest: Options = {}
    ): Step {
        if (typeof command === 'object' && !Array.isArray(command))
            return command
        return {
            name: rest.name,
            run: Array.isArray(command)
                ? command
                : command
                    .trim()
                    .split('\n')
                    .map(s => s.trim())
                    .filter(Boolean),
            env: rest.env,
            cwd: rest.cwd,
        }
    }
}
