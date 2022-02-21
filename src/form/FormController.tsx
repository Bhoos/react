import React from 'react';
import { TextParser } from './parsers';
import { GenericState, FormDefinition } from './types.js';

function toText(k: any): string {
  if (k === undefined || k === null || Number.isNaN(k)) return '';
  return String(k);
}

const DefaultDef = {
  parser: new TextParser()
};

type Listeners<T, F extends Function> = {
  [K in keyof T]?: Array<F>
};

export class FormController<T extends GenericState> {
  /**
   * The current state of the form after parsing the
   * user entered data
   */
  private state: Partial<T>;

  /**
   * Keep track of raw input data as provided by the
   * user
   */
  private inputs: {[K in keyof T]?: string};

  /**
   * The parsers defined for this form
   */
  private def: FormDefinition<T>;

  /**
   * Keep track of value listeners
   */
  private listeners: Listeners<T, (value: any) => void> = {};

  /**
   * Keep track of validators
   */
  private errorListeners: Listeners<T, (err: Error) => void> = {};

  /**
   * The url to submit to (POST)
   */
  private action: string;

  /**
   * The parent state for this form. Used for
   * getting the errorHandler all the way to the root
   * element. So that a root level error handler would
   * display all error messages
   */
  private parent: FormController<any>;

  /**
   * Avoid multiple submissions
   */
  private submitting: boolean = false;

  /**
   * Submit handler callback
   */
  private responseHandler: Function;

  /**
   * Submit error handler
   */
  private errorHandler: (err: Error) => void;

  constructor(def: FormDefinition<T>, initialState?: Partial<T>, action?: string, parent?: FormController<any>) {
    this.def = def;
    this.state = initialState || {};
    this.action = action;
    this.parent = parent;
    this.inputs = {};

    this.errorHandler = parent && parent.errorHandler;
  }

  getState() { return this.state; }

  submit = async () => {
    // Do not submit with a pending submit request
    if (this.submitting) return;

    // throw an error while trying to submit without a response handler
    if (!this.responseHandler) {
      throw new Error('No response handler defined');
    }

    // Perform validation
    // Just set all the input values, this will automatically run the validation code
    const validationError = Object.keys(this.def).reduce((error, name) => {
      const inp = this.inputs[name];
      return this.setInput(name, inp === undefined ? toText(this.state[name]) : inp) || error;
    }, null as Error);

    if (validationError) {
      this.errorHandler(new Error('Validation Error. Please check your input value(s).'));
      return;
    }

    try {
      this.submitting = true;
      const res = await fetch(this.action, {
        method: 'POST',
        headers: {
          "content-type": 'application/json',
        },
        body: JSON.stringify(this.state),
      });
      if (res.status === 500) {
        const response = await res.json();
        throw new Error(response.message);
      } else if (res.status === 200) {
        const response = await res.json();
        this.responseHandler(response);
      } else {
        const errorObj= await res.json();
        throw new Error(errorObj.message);
      }
    } catch (err) {
      if (this.errorHandler) {
        this.errorHandler(err);
      }
    } finally {
      this.submitting = false;
    }
  }

  setResponseHandler(handler: Function) {
    this.responseHandler = handler;
    return () => {
      this.responseHandler = null;
    }
  }

  setErrorHandler(handler: (err: Error) => void) {
    this.errorHandler = handler;
    return () => {
      this.errorHandler = this.parent ? this.parent.errorHandler : null;
    }
  }

  get<K extends keyof T>(name: K, defaultValue?: T[K]): T[K] | undefined {
    const res = this.state[name];
    return (res === undefined) ? defaultValue : res;
  }

  set<K extends keyof T>(name: K, newValue: T[K]) {
    // Object only if value changes
    if (newValue === this.state[name]) return;
    this.state = Object.assign({}, this.state, {[name]: newValue});
    const listeners = this.listeners[name];
    if (listeners) listeners.forEach(l => l(newValue));
  }

  getInput<K extends keyof T>(name: K): string {
    const k = this.inputs[name];

    // Use the user changed value as long as it's available, otherwise provide
    // the text representation of state value
    if (k === undefined) {
      const def = this.def[name];
      return def ? def.parser.toText(this.state[name]) : toText(this.state[name]);
    }

    // @ts-ignore
    return k;
  }

  setInput<K extends keyof T>(name: K, newValue: string): Error {
    this.inputs[name] = newValue;

    const { parser } = this.def[name] || DefaultDef;
    // Inform all the error listeners
    const list = this.errorListeners[name];
    let error: Error = null;
    try {
      const k = parser.parse(newValue, this.getState());
      this.set(name, k);
    } catch (err) {
      error = err;
    }
    if (list) list.forEach(listener => listener(error));
    return error;
  }

  private register<F extends Function>(target: Listeners<T, F>, name: keyof T, listener: F) {
    let list: Array<F> = target[name];
    if (!list) {
      list = [];
      target[name] = list;
    }
    list.push(listener);

    return () => {
      const idx = list.indexOf(listener);
      list.splice(idx, 1);
      if (list.length === 0) {
        delete this.listeners[name];
      }
    }
  }

  listenError(name: keyof T, listener: (err: Error) => void) {
    return this.register(this.errorListeners, name, listener);
  }

  listen<K extends keyof T>(name: K, listener: (value: T[K]) => void) {
    return this.register(this.listeners, name, listener);
  }
}

export const FormContext = React.createContext(new FormController<any>({}));

type Props<T extends GenericState> = {
  controller: FormController<T>;
  children: React.ReactNode;
};

export function Form<T extends GenericState>({ controller, children }: Props<T>) {
  return (
    <FormContext.Provider value={controller}>
      {children}
    </FormContext.Provider>
  );
}
