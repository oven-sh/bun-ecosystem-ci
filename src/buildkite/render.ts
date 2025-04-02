// import type { Pipeline } from "./types";
import type { TestSuite, Step, Context, EcosystemSuite } from '../../lib'
import { Pipeline } from '@buildkite/buildkite-sdk'
import type { CommandStep, GroupStep, WaitStep } from '@buildkite/buildkite-sdk'
import {
    StringStep,
    type PurpleStep,
} from '@buildkite/buildkite-sdk/src/schema'

const ciAgent =  {
    os: 'linux',
    arch: 'aarch64',
    distro: 'ubuntu',
    release: '24.04',
    robobun: 'true',
    robobun2: 'true',
    'cpu-count': '2',
    'image-name': 'linux-aarch64-2404-ubuntu-v10',
    preemptible: 'false',
    'instance-type': 'c8g.xlarge',
    'threads-per-core': '1',
}

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
    const testSuite: TestSuite =
        typeof suite === 'function' ? await suite(context) : suite

    /** Force following step to wait for previous steps to complete */
    const sequential: WaitStep = { wait: '~' }
    const pipeline = new Pipeline()
    for (const [key, value] of Object.entries(ciAgent)) {
        pipeline.addAgent(key, value)
    }
    pipeline
        .addStep({
            key: 'install-bun',
            name: 'Install Bun',
            command: 'curl -fsSL https://bun.sh/install | bash',
        })
        .addStep(sequential)

    for (const testCase of testSuite.cases) {
        const group: GroupStep = {
            // https://buildkite.com/docs/pipelines/configure/step-types/group-step
            group: testCase.name,
            depends_on: ['install-bun'],
            // skip: testCase.skip,
            steps: testCase.steps.flatMap(step => [
                mapStep(step) satisfies PurpleStep,
                StringStep.Wait,
            ]),
        }
        if (testCase.skip) group.skip = true
        pipeline.addStep(group)
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
            cmd.command = step.run[0].replaceAll('\n', '\\n')
            break
        default:
            cmd.commands = step.run.map(cmd => cmd.replaceAll('\n', '\\n'))
    }

    return {
        label: step.name,
        key: step.key,
        env: step.env,
        ...cmd,
    } satisfies CommandStep
}
