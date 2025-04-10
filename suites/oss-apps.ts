import { installAndTest } from '../lib'
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
    },
    undb: {
        repository: 'https://github.com/undb-io/undb',
        ref: 'develop',
    },
})
