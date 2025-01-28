import { beforeAll, afterAll } from "bun:test"
declare global {
    function before(fn: () => void | Promise<unknown>): void
    function after(fn: () => void | Promise<unknown>): void
}
globalThis.before = beforeAll
globalThis.after = afterAll
