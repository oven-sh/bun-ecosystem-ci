import { describe, it, expect } from 'bun:test'
import { Step } from './test-suite'

describe('Step.from', () => {
    it('can create a step from a command', () => {
        expect(Step.from('echo "hello"')).toEqual({
            run: ['echo', 'hello'],
        })
    })
})
