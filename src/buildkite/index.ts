import assert from 'node:assert'
import suites from '../../suites'
import { createPipeline } from './render'
import { toSnakeCase } from '../util'

export default async function main(): Promise<void> {
    // TODO: run all suites. Only foundatino regression is useful as of now
    const suite = suites.foundationRegression
    assert(suite)
    assert(suite.name)

    // TODO: pass in context
    const pipeline = await createPipeline(suite)
    const filename = toSnakeCase(suite.name!) + '.yml'
    await Bun.write(filename, pipeline.toYAML())
    await Bun.spawn(['buildkite-agent', 'pipeline', 'upload', filename], {
        stdio: ['ignore', 'inherit', 'inherit'],
    })
}
