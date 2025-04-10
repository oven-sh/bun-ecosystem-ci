import { truthy } from '../../lib'

/**
 * @see [Annotation Options](https://buildkite.com/docs/agent/v3/cli-annotate#creating-an-annotation-options)
 */
interface AnnotateOptions {
    /**
     * The context of the annotation used to differentiate this annotation from others
     */
    context: string
    /**
     * @default 'error'
     */
    style?: 'success' | 'info' | 'warning' | 'error'
    /**
     * @default true
     */
    append?: boolean
    /**
     * Annotations iwth a priority of `10` are shown first, while annotations
     * with a priority of `1` are shown last.
     *
     * @default 3
     * @min 1
     * @max 10
     */
    priority?: number
    /**
     * The annotation to display
     */
    content: string
}

export async function annotate(options: AnnotateOptions) {
    const {
        context,
        content,
        style = 'error',
        append = true,
        priority = 3,
    } = options

    const args = [
        'annotate',
        append && '--append',
        `--context ${context}`,
        `--style ${style}`,
        `--priority ${priority}`,
        content,
    ].filter(truthy)

    const child = Bun.spawn(['buildkite-agent', ...args], {
        stdin: 'ignore',
        stdout: 'pipe',
        stderr: 'inherit',
    })

    const [stdout, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        child.exited,
    ])
    if (exitCode !== 0)
        throw new Error(`annotate failed with exit code ${exitCode}`)

    return stdout
}
