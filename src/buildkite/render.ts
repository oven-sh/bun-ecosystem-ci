import type { Context, EcosystemSuite, TestCase } from '../../lib'
import { TestSuite } from '../../lib/test-suite'
import { Pipeline } from '@buildkite/buildkite-sdk'
import type { GroupStep } from '@buildkite/buildkite-sdk'
import { type PurpleStep } from '@buildkite/buildkite-sdk/src/schema'
import * as shell from '../shell'

export class PipelineFactory {
    private pipeline: Pipeline
    private context: Context
    static #ciAgent: Record<string, string> = {
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

    constructor(context?: Partial<Context>) {
        this.context = {
            isLocal: false,
            bun: 'bun',
            ...context,
        }
        this.pipeline = new Pipeline()
        for (const [key, value] of Object.entries(PipelineFactory.#ciAgent)) {
            this.pipeline.addAgent(key, value)
        }

        this.renderTestCase = this.renderTestCase.bind(this)
    }

    public toYAML(): string {
        return this.pipeline.toYAML()
    }

    public async addTestSuite(ecosystemSuite: EcosystemSuite): Promise<void> {
        // each suite maps to a group step
        const suite = await TestSuite.reify(ecosystemSuite, this.context)
        const group: GroupStep = {
            group: suite.name,
            steps: suite.cases.flatMap(this.renderTestCase),
        }
        this.pipeline.addStep(group)
    }

    private renderTestCase(testCase: TestCase): PurpleStep {
        const scriptLines = shell.renderTestCase(testCase)
        const script = /* sh */`
set -eo pipefail
${scriptLines.join('\n')}
`.trim()

        return {
            label: testCase.name,
            skip: testCase.skip,
            env: testCase.env,
            command: script,
        }
    }
}

