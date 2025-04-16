import assert from 'node:assert'
import type { Step, TestCase, TestSuite, Maybe } from '../lib'
import { truthy } from './util'

/**
 * Render a test suite into a shell script.
 *
 * @internal
 *
 * @param suite The test suite to render
 */
export function renderSuite(suite: TestSuite): string[] {
    const { name, cases } = suite
    assert(cases.length > 0, `Suite '${name}' has no test cases`)

    const renderedCases: string[] = cases
        .map(renderTestCase)
        .map(steps => (steps.push('\n'), steps))
        .flat()

    return [
        '#!/bin/bash',
        `# Suite: ${name}`,
        '',
        'set -eo pipefail',
        '',
        ...renderedCases,
    ]
}

/**
 * Render a test case into a shell script.
 *
 * @internal
 *
 * @param testCase the test case to render
 * @returns a list of lines. Join them together to form part of, or a whole,
 * bash script.
 */
export function renderTestCase(testCase: TestCase): string[] {
    const { name, cwd, steps, skip } = testCase
    assert(steps.length > 0, `Test case '${name}' has no steps`)

    let lines = [
        `# Test Case: ${name}`,
        `echo 'Running Test Case: ${name.replaceAll("'", "\\'")}'`,
        ...withDir(cwd)(steps.flatMap(renderStep)),
    ]

    if (skip) {
        lines = [`# Skipping '${name}'`, ...comment(lines)]
    }

    return lines
}

/**
 * Render a step as a list of shell commands.
 *
 * @internal
 *
 * @param step The step to render. Steps must have at least one command.
 * @returns a list of shell commands. These can be joined with newlines to
 * create part of a bash script.
 */
export function renderStep(step: Step): string[] {
    const { name, cwd, env, run } = step
    assert(run.length > 0, `Step '${name || '<anonymous>'}' has no commands`)

    let cmds: string[] = []
    if (cwd) cmds.push(`cd ${cwd}`)
    if (env)
        for (const [key, value] of Object.entries(env)) {
            cmds.push(`export ${key}="${value}"`)
        }
    cmds.push(...run)

    const lines = [`# Step: ${name ?? [run[0]]}`]
    if (name) lines.push(`echo '${name.replaceAll("'", "\\'")}'`)
    lines.push(...withTimeout(step.timeout)(subshell(indent(cmds))))

    return lines
}

type Lines = string[] | (() => string[])
const reifyLines = (lines: Lines) => (Array.isArray(lines) ? lines : lines())
const wrap = (enter: string, exit: string) => (lines: Lines) => [
    enter,
    ...reifyLines(lines),
    exit,
]

/**
 * Comment out commands
 */
const comment = (lines: Lines) => reifyLines(lines).map(line => `# ${line}`)
const indent = (lines: Lines) => reifyLines(lines).map(line => INDENT + line)
const INDENT = '  '

/** Change directories for the duration of some commands */
const withDir = (dir: string | undefined) =>
    dir ? wrap(`pushd ${dir}`, 'popd') : reifyLines //wrap('', '')
/** Runs commands in a subshell */
const subshell = wrap('(', ')')
const withTimeout =
    (timeout: Maybe<number>) =>
    (lines: string[]): string[] => {
        if (timeout == null || !lines.length) return lines
        if (lines.length > 2 && lines[0] == '(' && lines.at(-1) == ')') {
            let [_, ...rest] = lines
            rest.pop()
            if (!rest.length) return lines
            lines = rest
        }
        assert(timeout > 0)
        assert(lines.length > 0)
        const cmdArg = lines.filter(truthy).join(' && ').trim()
        return [
            `timeout --verbose --kill-after=${msToS(timeout * 2)} ${msToS(timeout)} bash -c "${cmdArg}"`,
        ]
    }
const msToS = (ms: number) => `${ms / 1000}s`
