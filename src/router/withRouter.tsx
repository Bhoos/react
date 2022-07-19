import React, { useEffect, useState } from 'react';
import { Portal } from './Portal.js';
import { Router } from './Router.js';

export function withRouter<T extends {}>(App: React.FC<T>, getInitialUrl: () => Promise<string>) {
  const mapRoute = (router: Router) => {
    router.use('/', null);
  };

  return (props: T) => {
    // Add a state to detect the initial url
    const [initialUrl, setInitialUrl] = useState(getInitialUrl ? null : '/');

    useEffect(() => {
      if (getInitialUrl) {
        getInitialUrl().then(url => setInitialUrl(url || '/'));
      }
    }, []);

    // When loading the initial url, avoid rendering the app
    if (!initialUrl) return null;

    return <Portal initialUrl={initialUrl} mapRoute={mapRoute} home={() => <App {...props} />} />;
  };
}
