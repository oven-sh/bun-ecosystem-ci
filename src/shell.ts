import assert from 'node:assert'
import type { Step, TestCase, TestSuite } from "../lib";

/**
 * Render a test suite into a shell script.
 * 
 * @internal 
 * 
 * @param suite The test suite to render
 */
export function renderSuite(suite: TestSuite): string[] {
    const { name, cases } = suite;
    assert(cases.length > 0, `Suite '${name}' has no test cases`)

    const renderedCases: string[] = cases.map(renderTestCase).map(steps => (steps.push('\n'), steps)).flat()
    // renderedCases.unshift(`# Suite: ${name}`)
    // return renderedCases
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
    const { name, cwd, env, steps, skip } = testCase;
    assert(steps.length > 0, `Test case '${name}' has no steps`)

    let lines = [
        `# Test Case: ${name}`,
        `echo 'Running Test Case: ${name.replaceAll("'", "\\'")}'`,
        ...withDir(cwd)(steps
            .map(renderStep)
            .map(steps => (steps.push('\n'), steps))
            .flat()
        )
    ];

    if (skip) {
        lines = [
            `# Skipping '${name}'`,
            ...comment(lines),
        ]
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
    const { name, cwd, env, run } = step;
    assert(run.length > 0, `Step '${name || '<anonymous>'}' has no commands`)

    let lines: string[] = []
    if (cwd) lines.push(`cd ${cwd}`)
    if (env) for (const [key, value] of Object.entries(env)) {
        lines.push(`export ${key}="${value}"`)
    }
    lines.push(...run)

    return [
        `# Step: ${name ?? [run[0]]}`,
        name && `echo '${name?.replaceAll("'", "\\'")}'`,
        ...subshell(lines),
    ].filter(Boolean) as string[]
}


type Lines = string[] | (() => string[])
const reifyLines = (lines: Lines) => Array.isArray(lines) ? lines : lines()
const wrap = (enter: string, exit: string) => (lines: Lines) => [
    enter,
    ...reifyLines(lines),
    exit,
]
/**
 * Comment out commands
 */
const comment = (lines: Lines) => reifyLines(lines).map(line => `# ${line}`)

/** Change directories for the duration of some commands */
const withDir = (dir: string | undefined) => dir ? wrap(`pushd ${dir}`, 'popd') : wrap('', '')
/** Runs commands in a subshell */
const subshell = wrap('(', ')')
