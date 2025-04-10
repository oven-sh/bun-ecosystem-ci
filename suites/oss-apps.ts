import { installAndTest, Step } from '../lib'
import { usesPnpm } from '../lib/install-and-test'

export default installAndTest('oss applications', {
    'next-starter': {
        repository: 'https://github.com/Skolaczk/next-starter',
    },
    remotion: {
        repository: 'https://github.com/remotion-dev/remotion',
        ...usesPnpm(),
        failing: true,
        skip: true, // FIXME
    },
    // they use bun
    onlook: {
        repository: 'https://github.com/onlook-dev/onlook',
        ref: 'v0.2.24',
        postinstall: ({ bun }) => `${bun} run build`,
        test: ctx =>
            Step.from(
                `${ctx.bun} run test --reporter=junit --reporter-outfile=/tmp/onlook-test.junit.xml`,
                {
                    buildkite: {
                        artifactPaths: ['/tmp/onlook-test.junit.xml'],
                    },
                }
            ),
    },
    undb: {
        repository: 'https://github.com/undb-io/undb',
        ref: 'develop',
    },
})
