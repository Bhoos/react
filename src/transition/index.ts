import React, { ComponentType } from 'react';
import { Controller } from './Controller.js';
import { createTransitionStateHook } from './useTransitionState.js';
import { createTransitionHook } from './useTransition.js';

import { Reducer, MapState } from './types.js';

export function createTransitionLibrary<S, A>(initialState: S, reducer: Reducer<S, A>) {
  const controller = new Controller(initialState, reducer);

  const useTransitionState = createTransitionStateHook(controller);

  return {
    dispatch: controller.dispatch,

    reset: controller.reset,

    getState: controller.getState,

    useTransitionState: useTransitionState,

    useTransition: createTransitionHook(controller),

    useDispatch: () => controller.dispatch,

    withVisibility: (visibilityCheck: MapState<S, boolean>) => {
      return <P = {}>(Component: ComponentType<P>) => {
        return (props: P) => {
          const visible = useTransitionState(visibilityCheck);
          if (!visible) return null;
          return React.createElement(Component, props);
        };
      };
    }
  };
}

export { useAnimatedStyle } from './useAnimatedStyle.js';
export { useAnimatedValue } from './useAnimatedValue.js';
