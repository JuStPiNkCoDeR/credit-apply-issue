/**
 * NOTE: The array conversion logic is different from usual query string.
 * E.g. symbols=["BTCUSDT","BNBBTC"] instead of symbols[]=BTCUSDT&symbols[]=BNBBTC
 */
export function stringifyKeyValuePair([key, value]: [
    unknown,
    string | number | boolean,
]): string {
    const valueString = Array.isArray(value)
        ? `["${value.join('","')}"]`
        : value
    return `${key}=${encodeURIComponent(valueString)}`
}

/**
 * NOTE: The array conversion logic for dustTransfer query
 * E.g. asset=BTC&asset=USDT
 */
export function stringifyKeyValuePairForDustTransfer([key, value]: [
    unknown,
    string | number | boolean,
]): string {
    if (Array.isArray(value)) {
        return value
            .map((item) => `${key}=${encodeURIComponent(item)}`)
            .join('&')
    }

    return `${key}=${encodeURIComponent(value)}`
}

export function isEmptyValue(input: unknown): boolean {
    /**
     * Scope of empty value: falsy value (except for false and 0),
     * string with white space characters only, empty object, empty array
     */
    return (
        (!input && input !== false && input !== 0) ||
        (typeof input === 'string' && /^\s+$/.test(input)) ||
        (input instanceof Object && !Object.keys(input).length) ||
        (Array.isArray(input) && !input.length)
    )
}

export function removeEmptyValue(
    obj: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> {
    const clearObj = obj
    Object.keys(clearObj).forEach(
        (key) => isEmptyValue(clearObj[key]) && delete clearObj[key],
    )
    return clearObj
}

export function buildQueryString(
    params: Record<string, string | number | boolean> | null,
    differentArrayFormat?: boolean,
): string {
    if (!params) {
        return ''
    }

    if (!differentArrayFormat) {
        return Object.entries(params).map(stringifyKeyValuePair).join('&')
    }

    return Object.entries(params)
        .map(stringifyKeyValuePairForDustTransfer)
        .join('&')
}
