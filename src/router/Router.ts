import { createContext } from 'react';
import { EffectHandler } from '../EffectHandler.js';
import { Route } from './Route.js';

type Transition = {
  confirm: () => void;
  cancel: () => void;
  route: Route;
};
export type ConfirmTransition = (transition: Transition) => void;
type UrlMapper = (url: string, cb: (url: string) => void) => Route | null;
/**
 * Router is an extension of effect handler
 * and should maintain a stack
 */
export class Router {
  private readonly effect: EffectHandler<Route>;
  readonly register: EffectHandler<Route>['register'];
  readonly get: EffectHandler<Route>['get'];
  private readonly routeStack: Array<Route> = [];
  private readonly stackSize: number;
  private mapUrl?: UrlMapper;
  private parentRouter: Router | null;
  private recentUrl: string | null = null;
  private childUrl: string = '';
  private childListeners: Array<Router> = [];
  private ConfirmTransitions: Array<ConfirmTransition> = [];
  private currentTransition: Array<ConfirmTransition> | null = null;
  private onRouteTransition: (route: string) => Promise<void>;
  /**
   * Create a router for handling route changes, with a
   * custom url mapper that is used by `setUrl`, for mapping
   * the url to a proper Route element.
   *
   * @param mapUrl
   */
  constructor(mapUrl?: UrlMapper, stackSize: number = 32) {
    this.effect = new EffectHandler();
    this.register = this.effect.register;
    this.get = this.effect.get;

    this.stackSize = stackSize;
    this.mapUrl = mapUrl;
  }

  setMapUrl = (mapUrl: UrlMapper, initialUrl?: string) => { 
    if (this.mapUrl) console.warn(new Error('Url mapper has already been declared')); 
    this.mapUrl = mapUrl; 
    if (initialUrl) this.setUrl(initialUrl); 
  };

  setOnRouteTransition = (transitionHandler: (route: string) => Promise<void>) => {
    this.onRouteTransition = transitionHandler;
  }

  private getRecentUrl(): string | null {
    if (this.recentUrl) return this.recentUrl;
    if (this.parentRouter) return this.parentRouter.getRecentUrl();
    return null;
  }

  registerChild = (childRouter: Router) => {
    this.childListeners.push(childRouter);
    childRouter.pushUrl(this.childUrl);
    return () => {
      const index = this.childListeners.findIndex(c => c === childRouter);
      if (index >= 0) {
        this.childListeners.splice(index, 1);
      }
    };
  };

  setChildUrl = (childUrl: string) => {
    this.childListeners.forEach(c => {
      c.pushUrl(childUrl);
    });
    this.childUrl = childUrl;
  };

  getInitialRoute = (parentRouter: null | Router) => {
    let k = this.get();
    if (k) return k;
    const url = parentRouter ? parentRouter.childUrl : this.getRecentUrl();
    if (url) {
      k = this.mapUrl(url, this.setChildUrl);
      this.effect.fire(k);
      return k;
    }
    return null;
  };

  private update = (route: Route) => {
    if (!route === null) {
      console.warn(
        "Trying to change to an invalid route. This doesn't have any effect, but might be a bug on your application",
      );
    }
    this.effect.fire(route);
    // Reset the recent url
    this.recentUrl = null;
  };
  /**
   * Change the route to the previous one based on the stack.
   * @returns boolean The return value only indicates if the pop operation
   *                  can be done or not. So, in cases when there is a
   *                  route transition in progress, the function with return
   *                  true. This value is specially useful where the Back
   *                  handlings are being used.
   */
  pop = async (): Promise<Route> => {
    // If a transition is already in progress then don't do anything just return a success
    const previousRoute = this.routeStack.pop();
    await this.updateRoute(previousRoute, this.update);
    return previousRoute;
  };
  /**
   * Change the current route on this router, clearing the stack in process
   * @param route
   */
  set = async <T>(route: Route<T>): Promise<void> => {
    this.routeStack.length = 0;
    if (this.get() === route) {
      // looks like the route we are trying to set is what is being displayed
      // just clear the stack and leave
      this.routeStack.length = 0;
      return;
    }
    // Perform the transition
    await this.updateRoute(route, this.update);
  };
  /**
   * Add route to the router stack. The push will not work if a
   * transition is already in progress, or one of the transition
   * confirmation handler cancels the transition
   * @param route
   */
  push = async (route: Route): Promise<void> => {
    // No need to do anything if the route has not changed
    if (this.get() === route) return;
    await this.updateRoute(route, (route: Route) => {
      // Limit the stack to a fixed size, forget any older routes
      while (this.routeStack.length >= this.stackSize) {
        this.routeStack.shift();
      }
      // Push the current route to the stack
      this.routeStack.push(this.get());
      // update the current route
      this.update(route);
    });
  };
  private async updateRoute(route: Route, op: (route: Route) => void): Promise<void> {
    // Can't start a transition if a one is already in progress, can't do anything
    if (this.currentTransition) throw new Error('Another route transition is in progress');
    // No need to go through a confirmation cycle if there aren't any registered
    if (!this.ConfirmTransitions.length) {
      op(route);
      return;
    }
    // Mark the transition to have started
    this.currentTransition = this.ConfirmTransitions;
    return new Promise<void>((resolve, reject) => {
      /**
       * Route transition complete is cancelled if any one of the listeners cancels
       * it. But requries confirmation from all of them for successfully completing it.
       */
      function complete(handler?: ConfirmTransition, err?: Error) {
        // Since the complete function is called for all listeners, the earlier ones
        // might have cancelled it which would have already resolved, so don't need
        // to do further checks
        if (!this.currentTransition) return;
        // The function is called without handler in case of cancellation
        if (!handler) {
          // The effect has been cancelled
          this.currentTransition = null;
          reject(err || new Error('Route transition was cancelled'));
        } else {
          const idx = this.currentTransition.indexof(handler);
          if (idx >= 0) {
            this.currentTransition.splice(idx, 1);
            if (this.currentTransition.length === 0) {
              this.currentTransition = null;
              op(route);
              resolve();
            }
          }
        }
      }
      this.ConfirmTransitions.forEach(handler =>
        handler({
          route,
          cancel: (err?: Error) => complete(null, err),
          confirm: () => complete(handler),
        }),
      );
    });
  }
  /**
   * Changed the route based on the given url. Uses `set(route)` after mapping the url.
   * @param url
   * @returns boolean true if the mapping was successful otherwise false
   */
  setUrl = async (url: string | null): Promise<Route> => {
    return this.updateUrl(url, this.set);
  };
  /**
   * Change the route based on the given url. Uses `push(route)` after mapping the url.
   * @param url
   * @returns boolean true if the mapping was successful otherwise false
   */
  pushUrl = async (url: string | null): Promise<Route> => {
    if ((url || '').startsWith('/') && this.parentRouter) {
      this.parentRouter.pushUrl(url);
    }
    return this.updateUrl(url, this.push);
  };
  private async updateUrl(url: string, op: (route: Route) => void): Promise<Route> {
    let newRoute: Route;
    if (this.onRouteTransition) {
      await this.onRouteTransition(url);
    }

    if (this.mapUrl) {
      newRoute = this.mapUrl(url || '', this.setChildUrl);
      op(newRoute);
    }
    this.recentUrl = url;
    return newRoute;
  }
  /**
   * Register a transition confirmation handler to cancel a route
   * change.
   * @param effect
   */
  registerConfirm(effect: ConfirmTransition) {
    this.ConfirmTransitions = this.ConfirmTransitions.concat(effect);
    return () => {
      this.ConfirmTransitions = this.ConfirmTransitions.filter(k => k !== effect);
      // if the effect is part of the current transition, consider it as a
      // confirmation
    };
  }

  getPreviousRoute() {
    return this.routeStack.at(-1);
  }

  getCurrentRoute() {
    return this.effect.get();
  }
}
/**
 * A default top level router available for all the applications.
 * In most cases, use the defaultRouter to map between login and main app.
 * For all other use cases create your own router
 */
export const defaultRouter = new Router();
export const RouterContext = createContext<Router>(defaultRouter);
