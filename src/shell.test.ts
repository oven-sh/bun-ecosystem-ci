import { describe, beforeAll, it, expect } from 'bun:test'
import os from 'node:os'
import path from 'node:path'
import { renderStep, renderTestCase, renderSuite } from "./shell";
import { Step, type Context } from "../lib";
import foundationRegression from '../suites/foundation-regression'

const id = () => Math.round(Math.random() * 10_000).toString(16)
const getTmpdir = (prefix: string) => path.join(os.tmpdir(), 'ecosystem-ci', 'shell', prefix + '-' + id())

let shellcheck: string | undefined
beforeAll(async () => {
    try {
        shellcheck = await Bun.$`which shellcheck`.text()
        console.log(shellcheck)
    } catch {
        switch (process.platform) {
            case 'darwin':
                await Bun.$`brew install shellcheck`
                break
            case 'linux':
                await Bun.$`apt-get install shellcheck`.nothrow()
                break
            default:
                throw new Error(`Could not find or install shellcheck binary. Please download it and try again.`)
        }
        shellcheck = await Bun.$`which shellcheck`.text()
    }
})

describe(renderStep, () => {
    describe("When a basic step is rendered", () => {
        let rendered: string[]
        let tmpdir: string
        const command = 'git clone git@github.com:oven-sh/bun-ecosystem-ci.git'

        beforeAll(() => {
            tmpdir = getTmpdir('render-step')
            rendered = renderStep(Step.from(command, { name: 'Clone this repository' }))
        })

        it('includes the step name', () => {
            expect(rendered[0]).toEqual('# Step: Clone this repository');
        })

        it('includes the step commands', () => {
            expect(rendered).toContainEqual(command)
        })

        it('produces a valid shell script', async () => {
            expect(shellcheck).toBeTruthy();
            const filename = path.join(tmpdir, 'basic-step.sh')
            // steps are script fragments, not full scripts, so we need to add a
            // shebang. Otherwise shellcheck will complain
            await Bun.write(filename, '#!/bin/bash\n' + rendered.join('\n'))
            const result = await Bun.spawn([shellcheck!, filename], { stdout: 'inherit' })
            expect(await result.exited).toBe(0)
        });
    })
})

describe(renderSuite, () => {
    describe("When the 'foundation regression' suite is rendered", () => {
        let rendered: string[]
        let tmpdir: string
        const context: Readonly<Context> = Object.freeze({
            isLocal: true,
            bun: 'bun',
        })

        beforeAll(async () => {
            tmpdir = getTmpdir('render-suite')
            const suite = typeof foundationRegression === 'function' ? await foundationRegression(context) : foundationRegression
            rendered = renderSuite(suite)
        })

        it('produces a valid shell script', async () => {
            expect(shellcheck).toBeTruthy();
            const filename = path.join(tmpdir, 'basic-step.sh')
            await Bun.write(filename, rendered.join('\n'))
            const result = await Bun.spawn([shellcheck!, filename], { stdout: 'inherit' })
            expect(await result.exited).toBe(0)
        })
    })
})
