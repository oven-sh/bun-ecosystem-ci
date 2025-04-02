import { Pipeline } from '@buildkite/buildkite-sdk'
import type { GroupStep } from '@buildkite/buildkite-sdk'
import type {
    StringStep,
    PurpleStep,
} from '@buildkite/buildkite-sdk/src/schema'
import type { Context, EcosystemSuite, TestCase } from '../../lib'
import { TestSuite } from '../../lib/test-suite'
import * as shell from '../shell'

export class PipelineFactory {
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

    private pipeline: Pipeline
    private context: Context
    private beforeEachCase: (PurpleStep | StringStep)[] = []

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

        this.beforeEachCase.push({
            label: 'Download Canary Build',
            command: './buildkite/setup-bun.sh',
            env: {
                BUN_VERSION: 'canary',
            },
        })
        

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
            steps: this.beforeEachCase.concat(
                suite.cases.flatMap(testCase =>
                    this.renderTestCase(testCase, suite.name)
                )
            ),
        }
        this.pipeline.addStep(group)
    }

    private renderTestCase(testCase: TestCase, suiteName?: string): PurpleStep {
        const label = suiteName
            ? `${suiteName}: ${testCase.name}`
            : testCase.name
        const scriptLines = shell.renderTestCase(testCase)
        const script = /* sh */ `
set -e
${scriptLines.join('\n')}
`.trim()

        return {
            label,
            skip: testCase.skip,
            env: testCase.env,
            command: script,
        }
    }
}
