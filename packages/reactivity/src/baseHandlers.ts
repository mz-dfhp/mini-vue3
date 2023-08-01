import { hasChanged } from '@vue/shared'
import { track, trigger } from './effect'
import { TrackOpTypes, TriggerOpTypes } from './operations'
import { ReactiveFlags, type Target } from './reactive'

const get = createGetter()
const set = createSetter()

// 为什么用 Reflect
// 当 获取age 时要收集name name变化了 age也要重新计算
// 如果在原始对象取age 是不会对name 进行依赖收集
// const user = {
//   name: 'mz',
//   get age() {
//     return this.name
//   }
// }

function createGetter() {
  return function (target: Target, key: string | symbol, receiver: object) {
    // 这几个 判断 都是控制 已经被代理了 直接返回 true 就在 createReactiveObject 就直接返回 target 了
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    const res = Reflect.get(target, key, receiver)
    track(target, TrackOpTypes.GET, key)
    return res
  }
}
function createSetter() {
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
