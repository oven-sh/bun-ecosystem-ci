export const pick = <
    T extends Record<string | number | symbol, any>,
    K extends keyof T,
>(
    obj: T,
    keys: K[]
): Pick<T, K> => {
    var result = {} as Pick<T, K>
    for (const key of keys) {
        if (key in obj) result[key] = obj[key]
    }
    return result
}
