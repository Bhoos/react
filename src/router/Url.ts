import { shallowEqual } from '@bhoos/utils';

type Query = {
  [param: string]: string;
};

export class Url {
  private readonly parts: string[];
  private query: Query;
  searchPath: string;

  remaining?: string[];

  constructor(uri: string | Url) {
    if (typeof uri === 'string') {
      const [urlPath, searchQueryPath] = uri.split('?');

      this.searchPath = searchQueryPath;
      this.parts = splitUrlPath(urlPath);
      this.query = splitSearchPath(searchQueryPath);
    } else {
      this.parts = uri.remaining || [];
      this.query = uri.query;
    }
  }

  /**
   * This is a one time function
   * @param path
   * @returns
   */
  match = (path: string) => {
    // Check if the url has already been used
    if (this.remaining) return null;

    const parts = path.split('/').filter(k => k.trim().length > 0);
    if (parts.length > this.parts.length) return null;

    const params = Object.assign({}, this.query);

    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (part.startsWith(':')) {
        const param = part.substring(1);
        params[param] = this.parts[i];
      } else if (part.toLowerCase() !== this.parts[i]) {
        return null;
      }
    }

    /** We have matched the url, this url should not be usable any more */
    this.remaining = this.parts.slice(parts.length);

    /** if there is any remaining left, attach query to it */
    if (this.remaining.length) {
    }

    return params;
  };

  getRemaining = () => {
    return new Url(this);
  };

  isRemaining = () => {
    return this.remaining && this.remaining.length;
  };

  equals = (uri: string) => {
    const [urlPath, searchQueryPath] = uri.split('?');

    /* check only the uri path first */
    if (urlPath !== this.parts.join('/')) return false;

    if (Object.keys(this.query).length && !searchQueryPath) return false;

    if (!shallowEqual(this.query, splitSearchPath(searchQueryPath))) return false;

    return true;
  };
}

function splitSearchPath(search: string) {
  if (!search) return {};

  const searchQueryPathBroken: Record<string, string> = {};

  search.split('&').forEach(query => {
    const [left, right] = query.split('=');
    searchQueryPathBroken[left] = right;
  });

  return searchQueryPathBroken;
}

function splitUrlPath(urlPath: string) {
  return urlPath
    .split('/')
    .filter(k => k.trim().length)
    .map(k => k.trim().toLowerCase());
}
