import { useRef } from 'react';
import { Animated } from 'react-native';

// @ts-ignore
function createValue(v) {
  if (typeof v === 'number') return new Animated.Value(v);
  if (Array.isArray(v)) return v.map(createValue);
  if (typeof v === 'object') {
    return Object.keys(v).reduce((res, key) => {
      // @ts-ignore
      res[key] = createValue(v[key]);
      return res;
    }, {});
  }
  throw new Error(`Cannot create an animated value from ${v}`);
}

// @ts-ignore
export function useAnimatedValue(initial) {
  const driver = useRef();
  if (!driver.current) {
    driver.current = createValue(typeof initial === 'function' ? initial() : initial);
  }
  return driver.current;
}