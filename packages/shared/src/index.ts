export function isObject(val: unknown): val is Record<any, any> {
  return val !== null && typeof val === 'object'
}

/**
 *
 * @description 两个值比较 是否有更改 考虑 NaN
 * @returns boolean
 */
export function hasChanged(value: any, oldValue: any): boolean {
  return !Object.is(value, oldValue)
}

export const extend = Object.assign

export const isArray = Array.isArray

export type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N
