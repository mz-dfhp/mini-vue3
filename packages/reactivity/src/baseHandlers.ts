import { hasChanged, isObject } from '@vue/shared'
import { track, trigger } from './effect'
import { TrackOpTypes, TriggerOpTypes } from './operations'
import { ReactiveFlags, type Target, reactive, readonly } from './reactive'

const get = createGetter()
const set = createSetter()

const shallowGet = createGetter(false, true)
const shallowSet = createSetter(true)

const readonlyGet = createGetter(true)

// 为什么用 Reflect
// 当 获取age 时要收集name name变化了 age也要重新计算
// 如果在原始对象取age 是不会对name 进行依赖收集
// const user = {
//   name: 'mz',
//   get age() {
//     return this.name
//   }
// }

function createGetter(isReadonly = false, shallow = false) {
  return function (target: Target, key: string | symbol, receiver: object) {
    // 这几个 判断 都是控制 已经被代理了 直接返回 true 就在 createReactiveObject 就直接返回 target 了
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    if (key === ReactiveFlags.IS_READONLY) {
      return true
    }
    if (key === ReactiveFlags.IS_SHALLOW) {
      return true
    }
    const res = Reflect.get(target, key, receiver)

    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key)
    }
    // 浅层代理 直接返回 只代理第一层
    if (shallow) {
      return res
    }
    // 取值时递归代理
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }
    return res
  }
}
function createSetter(shallow = false) {
  return function (target: Target, key: string | symbol, value: unknown, receiver: object) {
    const oldValue = (target as any)[key]
    // boolean
    const result = Reflect.set(target, key, value, receiver)
    // 判断是否有更改值
    if (hasChanged(oldValue, value)) {
      // 触发依赖
      trigger(target, TriggerOpTypes.SET, key)
    }
    return result
  }
}

export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
}

export const shallowReactiveHandlers: ProxyHandler<object> = {
  get: shallowGet,
  set: shallowSet,
}

export const readonlyHandlers: ProxyHandler<object> = {
  get: readonlyGet,
  set(target, key) {
    console.warn(`设置${String(key)}失败`, target, '是只读对象')
    return true
  },
}
