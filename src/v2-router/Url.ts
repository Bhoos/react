import React from "react";
import { Route } from './Route.js';

type Query = {
  [param: string]: string;
};

export class UrlParser {
  private readonly parts: string[];
  private readonly query: Query = {};

  private _remaining: UrlParser | null = null;
  private _route: Route = null;

  private constructor(parts: string[], query: Query)
  private constructor(url: string)
  private constructor(url: string | string[], query?: Query) {
    if (typeof url === 'string') {
      // Split the url into path and query string
      const queryStart = url.indexOf('?');
      let path = url;
      if (queryStart >= 0) {
        path = url.substring(0, queryStart - 1);
        const params = url.substring(queryStart + 1).split('&');
        params.forEach((param) => {
          const [name, value] = param.split('=', 2);
          this.query[name] = value;
        });
      }

      this.parts = path.split('/').map(k => k.trim()).filter(k => k.length > 0);
    } else {
      this.parts = url;
      this.query = query;
    }
  }

  static create(url: string) {
    return new UrlParser(url);
  }

  /**
   * This is a one time function
   * @param path 
   * @returns 
   */
  use(path: string, Comp: React.FC) {
    // If a route has already been detected for this particular usl, we cannot 
    // use it anymore
    if (this._route) return;

    const parts = path.split('/').filter(k => k.trim().length > 0);
    if (parts.length > this.parts.length) return null;
    
    const params: { [name: string]: string } = {};

    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (part.startsWith(':')) {
        const param = part.substring(1);
        params[param] = this.parts[i];
      } else if (part.toLowerCase() !== this.parts[i]) {
        return;
      }
    }

    // Override the query object with params
    const props = Object.assign({}, this.query, params);
    
    this._route = new Route(Comp, props);
    if (this.parts.length > parts.length) {
      this._remaining = new UrlParser(this.parts.slice(parts.length), this.query);
    } else {
      this._remaining = null;
    }

    return params;
  }

  get remaining() {
    return this._remaining;
  }

  get route() {
    return this._route;
  }
}