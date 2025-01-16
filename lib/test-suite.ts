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
    isLocal: boolean
}
export type EcosystemSuite =
    | TestSuite
    | ((context: Context) => TestSuite | Promise<TestSuite>)

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
export namespace TestCase {
    export function from(name: string, steps: (string | Step)[]): TestCase {
        return {
            name,
            steps: steps.map(step =>
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
    export function from(command: string | string[], rest: Partial<Omit<Step, 'run'>> = {}): Step {
        return {
            name: rest.name,
            run: Array.isArray(command)
                ? command
                : command.trim()
                    .split('\n')
                    .map(s => s.trim())
                    .filter(Boolean),
            env: rest.env,
            cwd: rest.cwd,
        }
    }
}
