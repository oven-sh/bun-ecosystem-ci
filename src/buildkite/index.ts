
import suites from '../../suites'
// import { createPipeline } from './render'
import { PipelineFactory } from './render'

import type { Context } from '../../lib'

export default async function main(): Promise<void> {
    const context: Context = {
        isLocal: false,
        bun: 'bun',
    }
    const builder = new PipelineFactory(context)
    for (const ecosystemSuite in suites) {
        const suite = suites[ecosystemSuite]
        await builder.addTestSuite(suite)
    }
    const filename = 'ecosystem-ci.yml'
    await Bun.write(filename, builder.toYAML())
    await Bun.spawn(['buildkite-agent', 'pipeline', 'upload', filename], {
        stdio: ['ignore', 'inherit', 'inherit'],
    })
}
