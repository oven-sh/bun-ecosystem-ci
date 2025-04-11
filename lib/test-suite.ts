import deepmerge from 'deepmerge'
import type { Maybe } from './types'
import { strict as assert } from 'node:assert'
import { truthy } from '../src/util'

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
export interface Context<D = any> {
    /**
     * Are we running tests locally or in CI?
     */
    isLocal: boolean
    runner: 'bun' | 'shell' | 'buildkite'
    /**
     * Name of bun binary. Use this instead of hardcoding `'bun'` into steps.
     */
    bun: string
    data?: D
}

export type EcosystemSuite<D = any> =
    | TestSuite<D>
    | ((context: Readonly<Context<D>>) => TestSuite<D> | Promise<TestSuite<D>>)

export interface TestSuite<D = any> {
    name?: string
    cases: TestCase[]
    beforeAll?: (context: Readonly<Context<D>>) => void | Promise<void>
    afterAll?: (context: Readonly<Context<D>>) => void | Promise<void>
}
export namespace TestSuite {
    export async function reify(
        suite: EcosystemSuite,
        context: Readonly<Context>
    ): Promise<TestSuite> {
        const testSuite =
            typeof suite === 'function' ? await suite(context) : suite
        return testSuite
    }
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
        stepsOrOptions:
            | Options
            | Maybe<string | Step | Maybe<string | Step>[]>[]
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
                .flat()
                .filter(truthy)
                .map(s => Step.from(s)),
            cwd,
            env,
            failing,
            skip,
        }
    }
}

export interface Step {
    /**
     * Unique identifier for the step. Should be in `kebab-case`.
     * @example "install-bun"
     */
    key?: string
    /**
     * Human-friendly display name
     */
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
    /**
     * Timeout for this step in milliseconds. If the step takes longer than
     * this, it fails. By default, no timeout is set.
     *
     * @min 1
     */
    timeout?: number
    /**
     * Buildkite-specific configuration. These aren't used for other kinds of runners.
     */
    buildkite?: Step.BuildkiteOptions
}
export namespace Step {
    export type Options = Partial<Omit<Step, 'run'>>

    export interface BuildkiteOptions {
        /**
         * [Buildkite plugins](https://buildkite.com/docs/pipelines/integrations/plugins)
         * to add to the step.
         */
        plugins?: Record<string, any>
        artifactPaths?: string[]
    }

    export function from(
        command: string | string[] | Step,
        rest: Options = {}
    ): Step {
        if (Step.is(command)) {
            for (const key in rest) {
                const k = key as keyof Options
                const value = rest[k]
                if (value == null) continue
                const existing = command[k]
                if (
                    existing &&
                    typeof existing === 'object' &&
                    typeof value === 'object'
                ) {
                    command[k] = deepmerge(existing as any, value as any) as any
                } else {
                    command[k] ||= value as any
                }
            }
            return command
        }

        return {
            ...rest,
            run: Array.isArray(command)
                ? command
                : command
                      .trim()
                      .split('\n')
                      .map(s => s.trim())
                      .filter(truthy),
        }
    }

    /**
     * @returns `true` if `value` is a {@link Step}
     */
    export function is(value: unknown): value is Step {
        if (typeof value !== 'object' || !value) return false
        if (!('run' in value) || !Array.isArray(value.run)) return false
        if ('name' in value) {
            const name = value.name
            if (name !== undefined && typeof name !== 'string') return false
        }

        return true
    }

    export function validate(step: Step): void {
        assert(step.run?.length, 'Step must have at least one command')
        if (step.timeout != null) {
            assert(
                step.timeout > 0,
                `Timeout must be greater than 0, got ${step.timeout}`
            )
        }
    }
}
