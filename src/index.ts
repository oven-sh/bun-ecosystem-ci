import local from './local'
import buildkite from './buildkite'
import { envVarEnabled } from './util'

const { CI } = process.env

if (CI && process.argv.length <= 2) {
    if (envVarEnabled('GITHUB_ACTIONS')) {
        throw new Error('GitHub Actions is not supported yet')
    }
    buildkite()
} else {
    local(process.argv)
}
