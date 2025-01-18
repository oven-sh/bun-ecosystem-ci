/**
 * Test suites have similar checks over a bunch of cases. Each case normally
 * corresponds to a single NPM package.
 *
 * These types are designed to be mappable to both `bun test` and
 * buildkite.
 * - `TestSuite` -> workflow
 * - `TestCase` -> job
 * - `Step` -> step lol
 *
 */
export interface Context {
    /**
     * Are we running tests locally or in CI?
     */
    isLocal: boolean
    /** Name of bun binary. Use this instead of hardcoding `'bun'` into steps. */
    bun: string
}
export type EcosystemSuite =
    | TestSuite
    | ((context: Readonly<Context>) => TestSuite | Promise<TestSuite>)

export interface TestSuite {
    name?: string
    cases: TestCase[]
    beforeAll?: (context: Context) => void | Promise<void>
    afterAll?: (context: Context) => void | Promise<void>
}

export interface TestCase {
    name: string
    steps: Step[]
    cwd?: string
    /**
     * Environment variables to set for each step
     */
    env?: Record<string, string | undefined>
}

const falsey = <T>(value: T): value is Exclude<T, undefined | null | false | 0 | ""> => Boolean(value)

export namespace TestCase {
    export function from(name: string, steps: (string | Step | null | undefined)[]): TestCase {
        return {
            name,
            steps: steps.filter(falsey).map(step =>
                typeof step === 'string' ? Step.from(step) : step
            ),
            cwd: undefined,
            env: undefined,
        }
    }
}

export interface Step {
    name?: string
    /**
     * Each line is a shell command to run
     */
    run: string[]
    env?: Record<string, string | undefined>
    cwd?: string
}
export namespace Step {
    export function from(
        command: string | string[] | Step,
        rest: Partial<Omit<Step, 'run'>> = {}
    ): Step {
        if (typeof command === 'object' && !Array.isArray(command)) return command
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
