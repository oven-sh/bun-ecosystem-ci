import { describe, it, expect } from 'bun:test'
import { pick } from './util'

describe('pick', () => {
    const obj = { a: 1, b: 2, c: 3 }

    it('should pick keys from object', () => {
        expect(pick(obj, ['a', 'b'])).toEqual({ a: 1, b: 2 })
    })

    it('does not pick missing keys', () => {
        expect(pick(obj, ['a', 'd'] as any)).toEqual({ a: 1 } as any)
    })
})
