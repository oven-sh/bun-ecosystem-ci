import { Step } from './test-suite'

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
    const clone = /* sh */ `git clone ${repository} --branch ${ref} --depth 1 --no-tags ${packageName}`
    const script = !isLocal
        ? clone
        : /* sh */ `
if [ -d ${packageName} ]; then
    echo "resetting to ${ref}"
    cd ${packageName}
    git fetch --depth 1 origin ${ref}
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
