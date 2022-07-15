import React from 'react';
import { Route } from './Route.js';
import { Url } from './Url.js';

type MapRoute = (router: Router) => void;
type SetRoute = React.Dispatch<React.SetStateAction<Route<any> | null>>;
type ParentRouter = Router | null;

export class Router {
  private readonly setRoute: SetRoute;
  private readonly parentRouter: ParentRouter;
  private readonly mapRoute: MapRoute;
  private stack: Array<Route<any>> = [];

  private currentUrl?: Url;
  private currentRoute?: Route<any>;

  constructor(mapRoute: MapRoute, setRoute: SetRoute, parentRouter: ParentRouter) {
    this.setRoute = setRoute;
    this.mapRoute = mapRoute;
    this.parentRouter = parentRouter;
  }

  public getInitialRoute(childRouter: Router) {
    if (!this.currentUrl || !this.currentUrl.isRemaining()) return null;

    childRouter.currentUrl = this.currentUrl.getRemaining();

    childRouter.currentRoute = undefined;
    childRouter.mapRoute(childRouter);
    childRouter.currentUrl = null;

    return childRouter.currentRoute;
  }

  public init(Component: React.FC) {
    const headRoute = new Route(Component);

    this.stack = [headRoute];

    return headRoute;
  }

  public use<T extends {}>(path: string, Component: React.FC<T>) {
    if (!this.currentUrl) return;

    const props = this.currentUrl.match(path) as T;

    if (props) {
      this.currentRoute = new Route(Component, props);
    }
  }

  public show<T extends {}>(route?: Route<T>) {
    if (route) this.stack.push(route);
    return this.setRoute(route);
  }

  public pop = (): void => {
    this.stack.pop();

    /** we still have routes left in the current route */
    if (this.stack.length) {
      return this.setRoute(this.stack[this.stack.length - 1]);
    }

    /**r
     * if this is the last route in this current router, and we have a parent router
     * set the last route from the parent route
     */
    if (this.parentRouter) {
      return this.parentRouter.pop();
    } else {
      return this.show(null);
    }
  };

  public set = (uri: string) => {
    this.stack.length = 0;
    this.push(uri);
  };

  public push = (uri: string | Url): void => {
    if (uri === '/') return this.reset();

    if (typeof uri === 'string') {
      if (uri.startsWith('/') && this.parentRouter) {
        return this.parentRouter.push(uri);
      }

      if (this.currentUrl && this.currentUrl.equals(uri)) return;
      this.currentUrl = new Url(uri);
    }

    this.currentRoute = undefined;
    this.mapRoute(this);

    return this.show(this.currentRoute);
  };

  private reset = () => {
    this.stack.length = 0;
    this.currentUrl = undefined;
    this.currentRoute = null;

    if (this.parentRouter === null) {
      /** now, we have reached the root router, just show the home component */
      return this.show(null);
    }

    /** clearing all the stack as we propagate back to the root router */
    this.parentRouter.reset();
  };
}
