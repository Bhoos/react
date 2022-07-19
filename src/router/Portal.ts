import React, { createElement, useEffect, useState } from 'react';
import { Route } from './Route.js';
import { RouterContext, useParentRouter } from './context.js';
import { Router } from './Router.js';

type Props = {
  mapRoute: (router: Router) => void;
  home: React.FC<any>;

  initialUrl?: string;
  onRouteChange?: (route: Route) => void;
};

export function Portal({ mapRoute, home, initialUrl }: Props) {
  // Get the parent router, this can be null in case of the top level router
  const parentRouter = useParentRouter();

  // Get an initial Route for initial render, the router will always return an
  // initial route, either via parent router or the default route
  const [route, setRoute] = useState<Route | null>();
  const [router] = useState(() => new Router(mapRoute, setRoute, parentRouter, initialUrl));
  const routeToRender = parentRouter?.getInitialRoute(router) || route || router.init(home);

  return createElement(
    RouterContext.Provider,
    {
      value: {
        router,
        route: routeToRender,
      },
    },
    routeToRender.createElement(),
  );
}
