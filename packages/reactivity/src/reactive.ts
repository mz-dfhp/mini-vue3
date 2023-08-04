import { isObject } from '@vue/shared'
import { mutableHandlers, readonlyHandlers, shallowReactiveHandlers } from './baseHandlers'

export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  IS_SHALLOW = '__v_isShallow',
}

export interface Target {
  [ReactiveFlags.IS_REACTIVE]?: boolean
  [ReactiveFlags.IS_READONLY]?: boolean
  [ReactiveFlags.IS_SHALLOW]?: boolean
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
  // 目标已经被代理过了 不需要多次代理 target在取值的时候会走 get [ReactiveFlags.IS_REACTIVE] return true
  if (target[ReactiveFlags.IS_REACTIVE]) {
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
