import { Step } from './test-suite'

type Checkout = { repository: string; ref?: string; packageName: string }
export const checkout: (options: Checkout) => Step = ({
    repository,
    ref = 'main',
    packageName,
}) =>
    Step.from(
        /* sh */ `
if [ -d ${packageName} ]; then
    echo "resetting to ${ref}"
    cd ${packageName}
    git fetch --depth 1 origin ${ref}
    git reset --hard ${ref}
else
    echo "cloning ${repository}/${ref}"
    git clone ${repository} --branch ${ref} --depth 1 --no-tags ${packageName}
fi
`,
        { name: `Checkout ${packageName}`, key: `checkout-${packageName}` }
    )
