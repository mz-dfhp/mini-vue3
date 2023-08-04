import { extend } from '@vue/shared'
import { type Dep, createDep } from './dep'
import type { TrackOpTypes, TriggerOpTypes } from './operations'
import { type Target } from './reactive'

export type EffectScheduler = (...args: any[]) => any
type KeyToDepMap = Map<any, Dep>

const targetMap = new WeakMap<any, KeyToDepMap>()

// eslint-disable-next-line import/no-mutable-exports
export let activeEffect: ReactiveEffect | undefined

/**
 * 副作用函数 此函数依赖的数据变化了 会重新执行
 * effect可以嵌套写 组件是基于effect
 * @param fn Function
 */
export class ReactiveEffect<T = any> {
  active = true // 默认激活状态
  parent: ReactiveEffect | undefined = undefined
  deps: Dep[] = []
  constructor(public fn: () => T) {}
  run() {
    // 当组件多层级嵌套时 不会出现问题
    // vue2 使用的栈结构来处理的 前进后出
    // 第一层 effect 执行 parent => undefined activeEffect => 自己
    // 第二层 effect 执行 parent => activeEffect(父亲) activeEffect = 自己
    // 第二层 effect 执行完 activeEffect => parent(父亲) parent = undefined
    // 收集sex 时 activeEffect指向第一层

    // effect(() => {    e1
    //   state        activeEffect => e1
    //   effect(() => {  e2
    //     state      activeEffect => e2
    //   })
    //   state        activeEffect => e1
    // })

    // 防止无限递归
    let parent: ReactiveEffect | undefined = activeEffect
    while (parent) {
      if (parent === this) {
        return
      }
      parent = parent.parent
    }
    try {
      this.parent = activeEffect
      activeEffect = this as ReactiveEffect
      // 分支切换 清除effect
      cleanupEffect(this)
      return this.fn()
    }
    finally {
      activeEffect = this.parent
      this.parent = undefined
    }
  }

  // 停止响应
  stop() {
    cleanupEffect(this)
    this.active = false
  }
}

/**
 * 问题 当有 flag 切换判断的时候 effect 函数中不需要收集不需要的 dep
 * @description  清除当前effect
 * @param effect
 */
function cleanupEffect(effect: ReactiveEffect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      // deps删除了effect targetMap中的 dep 也删除了 利用循环引用 指向同一块地址
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}

export interface ReactiveEffectOptions {
  onStop?: () => void
}

export interface ReactiveEffectRunner<T = any> {
  (): T
  effect: ReactiveEffect
}

export function effect(fn: () => void, options?: ReactiveEffectOptions): ReactiveEffectRunner {
  const _effect = new ReactiveEffect(fn)

  if (options) {
    extend(_effect, options)
  }
  if (!options) {
    _effect.run()
  }
  const runner = _effect.run.bind(_effect) as ReactiveEffectRunner
  runner.effect = _effect
  return runner
}

/**
 * @description   依赖收集
 * @param target 目标
 * @param type   类型
 * @param key    key
 */
export function track(target: Target, type: TrackOpTypes, key: unknown) {
  // Map key => target   value => Map ( key => target[key] value => Set(activeEffect))
  console.log(`取值：${type} - key：${key}`)
  if (!activeEffect) {
    return
  }
  let depMap = targetMap.get(target)
  if (!depMap) {
    targetMap.set(target, (depMap = new Map()))
  }
  let dep = depMap.get(key)
  if (!dep) {
    depMap.set(key, (dep = createDep()))
  }
  trackEffects(dep)
}

/**
 * @description   依赖收集
 * @param dep     依赖追踪实例
 */
export function trackEffects(dep: Dep) {
  let shouldTrack = false
  // 去重
  if (!dep.has(activeEffect!)) {
    shouldTrack = true
  }
  if (shouldTrack) {
    dep.add(activeEffect!)
    activeEffect!.deps.push(dep)
  }
}

/**
 * @description   值修改 触发依赖
 * @param target 目标
 * @param type   类型
 * @param key    key
 */
export function trigger(target: Target, type: TriggerOpTypes, key: unknown) {
  console.log(`设值：${type} - key：${key}`)
  const depsMap = targetMap.get(target)
  if (!depsMap)
    return
  const dep = depsMap.get(key)
  if (!dep)
    return
  triggerEffects(dep)
}

function triggerEffects(dep: Dep) {
  const effects = [...dep]
  for (const effect of effects) {
    triggerEffect(effect)
  }
}

function triggerEffect(effect: ReactiveEffect) {
  // 防止在effect 放入自己 造成死循环
  // effect(() => {
  //   state.age = Math.random()
  // })
  if (effect !== activeEffect) {
    effect.run()
  }
}
