import { isObject } from '@vue/shared'
import { mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers } from './baseHandlers'

export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  IS_SHALLOW = '__v_isShallow',
  RAW = '__v_raw',
}

export interface Target {
  [ReactiveFlags.IS_REACTIVE]?: boolean
  [ReactiveFlags.IS_READONLY]?: boolean
  [ReactiveFlags.IS_SHALLOW]?: boolean
  [ReactiveFlags.RAW]?: any
}

// 存储 key => 目标对象 value => 被代理目标对象
export const reactiveMap = new WeakMap<Target, any>()
export const shallowReactiveMap = new WeakMap<Target, any>()
export const readonlyMap = new WeakMap<Target, any>()
export const shallowReadonlyMap = new WeakMap<Target, any>()

export function reactive<T extends object>(target: T) {
  return createReactiveObject(target, false, mutableHandlers, {}, reactiveMap)
}

export function shallowReactive<T extends object>(target: T) {
  return createReactiveObject(target, false, shallowReactiveHandlers, {}, shallowReactiveMap)
}

export function readonly<T extends object>(target: T) {
  return createReactiveObject(target, true, readonlyHandlers, {}, readonlyMap)
}

export function shallowReadonly<T extends object>(target: T) {
  return createReactiveObject(target, true, shallowReadonlyHandlers, {}, shallowReadonlyMap)
}

/**
 * @description 创建响应式对象
 * @param target 目标
 * @param isReadonly 是否是只读
 * @param baseHandlers 定义通过 Proxy 对象访问和修改响应式对象属性时的行为
 * @param collectionHandlers Map、Set、WeakMap 和 WeakSet 数据结构，会进行特殊处理
 * @param proxyMap Map存储  key => target value => 被 proxy 代理过的对象 多次代理同一个对象 直接返回
 * @returns 代理对象
 */
function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<Target, any>,
) {
  if (!isObject(target)) {
    console.warn('目标代理必须是对象')
  }
  // 目标已经被代理过了 并且不是 readonly 不需要多次代理 target在取值的时候会走 get [ReactiveFlags.IS_REACTIVE] return true
  if (target[ReactiveFlags.RAW]
    && !(isReadonly && target[ReactiveFlags.IS_REACTIVE])) {
    return target
  }

  // 目标已经有【相应的代理了】 第一次被代理会被 Map.set(target, proxy)
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  // 创建代理对象
  const proxy = new Proxy(target, baseHandlers)
  // 存储目标 和 代理 防止多次代理目标
  proxyMap.set(target, proxy)
  return proxy
}

/**
 * @description 是否是由 reactive() 或 shallowReactive() 创建的代理。
 * @example
 * ```js
 * isReactive(reactive({}))            // => true
 * isReactive(readonly(reactive({})))  // => true
 * isReactive(ref({}).value)           // => true
 * isReactive(readonly(ref({})).value) // => true
 * isReactive(ref(true))               // => false
 * isReactive(shallowRef({}).value)    // => false
 * isReactive(shallowReactive({}))     // => true
 * ```
 * @param value
 * @returns boolean
 */
export function isReactive(value: unknown): boolean {
  if (isReadonly(value)) {
    return isReactive((value as Target)[ReactiveFlags.RAW])
  }
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE])
}

/**
 * @description 是否为只读对象 通过 readonly() 和 shallowReadonly() 创建的代理
 * @param value
 * @returns boolean
 */
export function isReadonly(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE])
}

/**
 * @description 是否是由 shallowReactive() 或 shallowReadonly() 创建的代理。
 * @param value
 * @returns boolean
 */
export function isShallow(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_SHALLOW])
}

/**
 * @description 是否是由 reactive()、readonly()、shallowReactive() 或 shallowReadonly() 创建的代理。
 * @param value
 * @returns boolean
 */
export function isProxy(value: unknown): boolean {
  return isReactive(value) || isReadonly(value)
}

/**
 * @description 根据一个 Vue 创建的代理返回其原始对象。
 * @param observed
 * @returns value
 */
export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as Target)[ReactiveFlags.RAW]
  return raw ? toRaw(raw) : observed
}

/**
 * @description 将普通值转换为响应式值的函数
 * @param value
 * @returns reactive value
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
export function toReactive<T extends unknown>(value: T): T {
  return isObject(value) ? reactive(value) : value
}
