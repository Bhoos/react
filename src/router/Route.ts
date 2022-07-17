import React from 'react';

type Component<P extends {}> = React.FC<P>;

/**
 * An immuatable Route structure that can be rendered
 * via react.
 */
export class Route<P extends {} = {}> {
  readonly params: P;
  readonly component: Component<P>;

  constructor(component: Component<P>, params = {} as P) {
    this.component = component;
    this.params = params;
  }

  /**
   * Create react element for rendering
   */
  createElement() {
    return React.createElement(this.component, this.params);
  }
}
