import { installAndTest } from '../lib'

export default installAndTest('oss applications', {
    // AFFiNE: {
    //     repository: 'https://github.com/toeverything/AFFiNE',
    //     ref: 'canary',
    // },
    'next-starter': {
        repository: 'https://github.com/Skolaczk/next-starter',
    },
    remotion: {
        repository: 'https://github.com/remotion-dev/remotion',
        postinstall: ({ bun }) => `${bun} run build`,
        failing: true, // uses pnpm workspaces
    },
    // they use bun
    onlook: {
        repository: 'https://github.com/onlook-dev/onlook',
        postinstall: ({ bun }) => `${bun} run build`,
    },
})
