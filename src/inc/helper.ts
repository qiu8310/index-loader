/**
 * 保证函数 fn 只会被调用一次，并且以后每次调用都会返回第一次的结果
 *
 * @example
 *
 * once(() => {  })             // 返回一个函数
 */
export function once(fn: (...args: any[]) => any): (...args: any[]) => any

/**
 * 保证函数 fns 中的所有函数只会被调用一次，并且以后每次调用都会返回第一次被调用的函数的结果
 *
 * @example
 *
 * once([() => {}, () => {}, ...])   // 返回一个函数数组
 */
export function once(fns: ((...args: any[]) => any)[]): ((...args: any[]) => any)[]

export function once(fns: any): any {
  let called = false
  let result: any

  let isArray = Array.isArray(fns)

  let newFns = toArray(fns).map(
    fn =>
      function(this: any, ...args: any[]) {
        if (called) return result
        called = true
        result = fn.apply(this, args)
        return result
      }
  )

  return isArray ? newFns : head(newFns)
}

/**
 * 将单个元素转化成数组，保证结果一定是个数据
 *
 * 注意，不要用在 toArray(arguments) 上
 */
export function toArray<T>(item: T | T[]): T[] {
  return Array.isArray(item) ? item : [item]
}

/**
 * Head of list
 *
 * return arr[0]
 */
export function head<T>(arr: T[]): T {
  return arr[0]
}

/**
 * Converts the first character of `string` to upper case and the remaining
 * to lower case.
 *
 * @example
 *
 * capitalize('FRED')
 * // => 'Fred'
 */
export function capitalize(str: string): string {
  return upperFirst(str.toLowerCase())
}

/**
 * Converts the first character of `string` to upper case.
 */
export function upperFirst(str: string) {
  return str && str[0] ? str[0].toUpperCase() + str.slice(1) : ''
}
