/**
 * Pick keys from an object. Missing keys will be ignored.
 *
 * @param obj The object to pick keys from
 * @param keys The keys to pick
 *
 * @returns a new object with only the picked keys.
 */
export const pick = <
    T extends Record<string | number | symbol, any>,
    K extends keyof T,
>(
    obj: T,
    keys: Iterable<K>
): Pick<T, K> => {
    var result = {} as Pick<T, K>
    for (const key of keys) {
        if (key in obj) result[key] = obj[key]
    }
    return result
}

/**
 * @param name Name of the environment variable to check
 * @returns `true` if the environment variable exists and is some true-like value
 */
export const envVarEnabled = (name: string): boolean => {
    var value = process.env[name]
    if (!value) return false
    value = value.trim().toLowerCase()
    return (
        value === 'true' || value === '1' || value === 'yes' || value === 'on'
    )
}

/**
 * @param str a pascale, camel, kebab, or snake case string
 * @returns `str` in lower_snake_case
 */
export const toSnakeCase = (str: string): string => {
    if (str.includes('-')) return str.replaceAll('-', '_').toLowerCase()
    if (str.includes('_')) return str.toLowerCase()
    // pascale or camel case
    return str
        .replace(/^[A-Z]/, c => c.toLowerCase()) // handle first letter differently to avoid '_A'
        .replace(/([A-Z])/g, '_$1')
        .replace(/\s+/g, '_')
        .toLowerCase()
}
