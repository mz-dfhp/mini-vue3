import { hasChanged } from '@vue/shared'
import { type Dep, createDep } from './dep'
import { activeEffect, trackEffects, triggerEffects } from './effect'
import { isReadonly, isShallow, toRaw, toReactive } from './reactive'

declare const RefSymbol: unique symbol
export interface Ref<T = any> {
  value: T
  [RefSymbol]: true
}

export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>
export function isRef(r: any): r is Ref {
  return !!(r && r.__v_isRef === true)
}

export function ref<T extends Ref>(value: T): T
export function ref(value?: unknown) {
  return createRef(value, false)
}

export function shallowRef<T extends Ref>(value: T): T
export function shallowRef(value?: unknown) {
  return createRef(value, true)
}

/**
 * @description     创建响应式的、可更改的 ref 对象 用 ref 创建单一相应式数据性能更佳
 * @description     对象赋值给 ref，那么这个对象将通过 reactive() 创建 不是对象不会走 reactive
 * @param rawValue 目标
 * @param shallow  浅层代理
 * @returns
 */
function createRef(rawValue: unknown, shallow: boolean) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}

class RefImpl<T> {
  private _value: T // 代理
  private _rawValue: T // 原始值
  public readonly __v_isRef = true // 判断是否是 ref
  public dep?: Dep = undefined

  constructor(value: T, public readonly __v_isShallow: boolean) {
    this._rawValue = __v_isShallow ? value : toRaw(value)
    this._value = __v_isShallow ? value : toReactive(value)
  }

  // 使用类的 getter 和 setter 方法来获取和设置类的属性值
  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {
    const useDirectValue
      = this.__v_isShallow || isShallow(newVal) || isReadonly(newVal)
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal
      this._value = useDirectValue ? newVal : toReactive(newVal)
      triggerRefValue(this)
    }
  }
}

interface RefBase<T> {
  dep?: Dep
  value: T
}

export function trackRefValue(ref: RefBase<any>) {
  if (activeEffect) {
    ref = toRaw(ref)
    trackEffects(ref.dep || (ref.dep = createDep()))
  }
}

export function triggerRefValue(ref: RefBase<any>) {
  ref = toRaw(ref)
  const dep = ref.dep
  if (dep) {
    triggerEffects(dep)
  }
}
