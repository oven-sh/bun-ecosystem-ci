// import type { Pipeline } from "./types";
import type { TestSuite, Step, Context, EcosystemSuite } from '../../lib'
import { Pipeline } from '@buildkite/buildkite-sdk'
import type { BlockStep, CommandStep, GroupStep, InputStep, PipelineStep, TriggerStep, WaitStep } from '@buildkite/buildkite-sdk'
import { StringStep, type PurpleStep } from '@buildkite/buildkite-sdk/src/schema'

/**
 * Create a Buildkite {@link Pipeline} YAML file from a
 * runtime-agnostic {@link TestSuite}.
 * 
 * @param suite either a {@link TestSuite} or a suite factory function
 * @returns a new BuildKite pipeline object, which can be serialized to YAML
 */
export async function createPipeline(suite: EcosystemSuite): Promise<Pipeline> {
    // TODO: call beforeAll and make beforeAll useful in non-local mode
    const context: Context = Object.freeze({
        isLocal: false,
        bun: 'bun',
    })
    const testSuite: TestSuite = typeof suite === 'function' ? await suite(context) : suite

    /** Force following step to wait for previous steps to complete */
    const sequential: WaitStep = { wait: '~' }
    const pipeline = new Pipeline()
        .addStep({
            key: 'install-bun',
            name: 'Install Bun',
            command: 'curl -fsSL https://bun.sh/install | bash',
        })
        .addStep(sequential)

    for (const testCase of testSuite.cases) {
        pipeline
            .addStep({
                // https://buildkite.com/docs/pipelines/configure/step-types/group-step
                group: testCase.name,
                depends_on: ['install-bun'],
                skip: testCase.skip,
                steps: testCase.steps.flatMap(step => [mapStep(step) satisfies PurpleStep, StringStep.Wait]),
            } satisfies GroupStep)
            .addStep(sequential)
    }

    return pipeline
}

/**
 * @see [Defining Steps](https://buildkite.com/docs/pipelines/configure/defining-steps)
 */
function mapStep(step: Step) {
    let cmd: Pick<CommandStep, 'command' | 'commands'> = {}
    switch (step.run.length) {
        case 0:
            throw new Error('Step has no commands')
        case 1:
            cmd.command = step.run[0]
            break;
        default: cmd.commands = step.run
    }

    return {
        ...cmd,
        key: step.key,
        env: step.env,
        label: step.name,
    } satisfies CommandStep
}

type StepCommon = CommandStep & GroupStep & BlockStep & WaitStep & InputStep & TriggerStep
