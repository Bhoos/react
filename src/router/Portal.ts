import { createElement, useEffect } from 'react';
import { Router, RouterContext } from './Router.js';
import { useRoute, useRouter } from './hooks.js';
import { Route } from './Route.js';

type Props = {
  router: Router,
  onRouteChange?: (nextRoute: Route) => void,
};

/**
 * A portal renders the current route for the given router,
 * and provides the router to the underlying components via
 * context.
 */
export function Portal({ router, onRouteChange }: Props) {
  // List for change on the route
  const route = useRoute(router);
  const parentRouter = useRouter();
  if (parentRouter !== router) router.setParent(parentRouter);

  useEffect(() => {
    if (onRouteChange && route) onRouteChange(route);
  }, [route, onRouteChange]);

  // Do not render anything until a route is available
  if (!route) return null;
  

  return createElement(RouterContext.Provider, { value: router }, route.createElement());
}
