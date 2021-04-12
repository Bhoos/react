import { useRef } from 'react';
import { Animated } from 'react-native';

type ValueType<T> = T | { [name: string]: ValueType<T> };

type AnimValueType = ValueType<Animated.Value>;
type NumberType = ValueType<number>;
type CAnimValueType<T extends NumberType> = T extends object ? { [K in keyof T]: CAnimValueType<T[K]> } : Animated.Value;

function createDriver<T extends NumberType>(v: T): CAnimValueType<T> {
  // @ts-ignore
  if (typeof v === 'number') return new Animated.Value(v);
  // if (Array.isArray(v)) return v.map(createDriver);
  if (typeof v === 'object') {
    // @ts-ignore
    return Object.keys(v).reduce((res, key) => {
      // @ts-ignore
      res[key] = createDriver(v[key]);
      return res;
    }, {} as {[name: string]: AnimValueType });
  }

  throw new Error(`Cannot create an animated value from ${v}`);
}

export function useAnimatedStyle<T extends NumberType, S>(
  initial: T | (() => T),
  styler: (driver: CAnimValueType<T>) => S
): [S, CAnimValueType<T>] {
  const ref = useRef<[S, CAnimValueType<T>]>();

  if (!ref.current) {
    const driver = createDriver(typeof initial === 'function' ? initial() : initial);
    const style = styler(driver);
    ref.current = [style, driver];
  }

  return ref.current;
}