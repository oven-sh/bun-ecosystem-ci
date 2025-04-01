import { describe, it, expect } from 'bun:test'
import { pick, toSnakeCase } from './util'

describe('pick', () => {
    const obj = { a: 1, b: 2, c: 3 }

    it('should pick keys from object', () => {
        expect(pick(obj, ['a', 'b'])).toEqual({ a: 1, b: 2 })
    })


    it('does not pick missing keys', () => {
        expect(pick(obj, ['a', 'd'] as any)).toEqual({ a: 1 } as any)
    })

    it('can use any kind of iterable', () => {
        const keys = new Set<'a' | 'b'>(['a', 'b'])
        expect(pick(obj, keys)).toEqual({ a: 1, b: 2 })
    })
})

describe('toSnakeCase', () => {

    it.each([
        ['', ''],
        [' ', '_'],
        ['SCREAMING_SNAKE_CASE', 'screaming_snake_case'],
        ['camelCase', 'camel_case'],
        ['PascalCase', 'pascal_case'],
        ['APascaleWord', 'a_pascale_word'],
        ['word', 'word'],
        ['thisIsAWord', 'this_is_a_word'],
        ['kebab-case', 'kebab_case'],
        ['--kebab----case', '__kebab____case'],
        ['SCREAMING-KEBAB-CASE', 'screaming_kebab_case'],
    ])("'%s' -> '%s'", (input, expected) => {
        expect(toSnakeCase(input)).toEqual(expected)
    })
})
