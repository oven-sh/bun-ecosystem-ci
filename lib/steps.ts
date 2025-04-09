import os from 'node:os'
import fs from 'fs'
import { Step, type Context } from './test-suite'

type Checkout = {
    repository: string
    ref?: string
    packageName: string
    isLocal: boolean
}
export const checkout: (options: Checkout) => Step = ({
    repository,
    ref = 'main',
    packageName,
    isLocal,
}): Step => {
    const clone = /* sh */ `git clone ${repository} --branch ${ref} --depth 1 ${packageName}`
    const script = !isLocal
        ? clone
        : /* sh */ `
if [ -d ${packageName} ]; then
    echo "resetting to ${ref}"
    cd ${packageName}
    git fetch --depth 1 --tags --prune-tags origin ${ref}
    git reset --hard ${ref}
else
    echo "cloning ${repository}/${ref}"
    ${clone}
fi
`.trim()

    return Step.from(script, {
        name: `Checkout ${packageName}`,
        key: `checkout-${packageName}`,
    })
}

export namespace test {
    /**
     * `bun test`
     */
    export const bun =
        (reportName = 'bun-test') =>
        ({ bun }: Context) => {
            // TODO: determine OS tmpdir
            const outfile = `/tmp/${reportName}.junit.xml`
            return Step.from(
                `${bun} test --reporter=junit --reporter-outfile=${outfile}`,
                {
                    name: 'bun test',
                    buildkite: {
                        artifactPaths: [outfile],
                        // plugins: {
                        //     'junit-annotate#v2.6.0': {
                        //         artifacts: 'bun-test.junit.xml',
                        //     },
                        // },
                    },
                }
            )
        }
}
