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
    cd ${packageName}
    git reset --hard ${ref}
else
    git clone ${repository} --branch ${ref} --depth 1 --no-tags ${packageName}
fi
`,
        { name: `Checkout ${packageName}` }
    )
