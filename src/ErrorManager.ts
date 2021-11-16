import { useState, useEffect, Dispatch, SetStateAction } from 'react';

type ErrorName = string;
type ErrorSetter = Dispatch<SetStateAction<Error>>;
type ListenerStack = Array<ErrorSetter>;

class ErrorManager {
  private errSubscriptions = new Map<ErrorName, ListenerStack>();

  subscribe<T extends Error>(errClass: new (...args: any[]) => T, listener: Dispatch<SetStateAction<T>>) {
    const subsKey = errClass.name;
    let stack: ListenerStack;
    if (this.errSubscriptions.has(subsKey)) {
      stack = this.errSubscriptions.get(subsKey);
      const existing = stack.indexOf(listener);
      if (existing >= 0) {
        // Looks like this setter has already been used. This is most likely an error.
        // Display the warning for development mode, and make sure the setter is moved
        // to the top of the stack
        stack.splice(existing, 1);
        console.warn(`WARN: The same listener is already being used for ${subsKey}. This is a potential issue`);
      }
      stack.unshift(listener);
      
    } else {
      stack = [ listener ];
      this.errSubscriptions.set(subsKey, stack);
    }
    
    return () => {
      const idx = stack.indexOf(listener);
      if (idx >= 0) stack.splice(idx, 1);
      if (stack.length === 0) this.errSubscriptions.delete(errClass.name);
    }
  }

  fire(err: Error) {
    const stack = this.errSubscriptions.get(err.constructor.name);
    if (!stack || !stack.length) {
      console.warn(`No error handler found for ${err.constructor.name}. It might be possible you might have included multiple versions of @bhoos/react-kit library. Use yarn why @bhoos/react-kit to debug this issue`, err);
    } else {
      // Use the top of the stack listener to handle the error
      stack[0](err);
    }
  }

  clear(err: new (...args: any[]) => Error) {
    const stack = this.errSubscriptions.get(err.constructor.name);
    if (stack && stack.length) {
      stack[0](null);
    }
  }

  clearAll() {
    for (const stack of this.errSubscriptions.values()) {
      if (stack.length) stack[0](null);
    }
  }
}


/**
 * The globally available error manager for the application. It is
 * possible to have multiple instances of this variable if multiple
 * versions of the react-kit library has been included. 
 * Such cases must be avoided for unexpected responses.
 */
const globalErrorManager = new ErrorManager();

/**
 * Listen for specific type of error.
 * 
 * Ex:
 *   function NetworkErrorPopup() {
 *     const error = useError(NetworkError);
 *     return (
 *       <Modal visible={error !== null}>
 *         <Text>Network Error</Text>
 *         <Button title="Retry" onPress={() => error.retry()} />
 *         <Button title="Close" onPress={() => clearError(NetworkError)} />
 *       </Modal>
 *     );
 *   }
 *   
 * @param errClass 
 * @returns 
 */
export function useError<T extends Error>(errClass: new (...args: any[]) => T) {
  const [err, setError] = useState<T>(null)
  useEffect(() => {
    return globalErrorManager.subscribe(errClass, setError);
  }, [errClass]);

  return err;
}

/**
 * Let the error handler know of any specific error.
 * @param err 
 */
export function raiseError(err: Error) {
  globalErrorManager.fire(err);
}

/**
 * Manually clearn any specific type of error.
 * @param err 
 */
export function clearError(errorClass: new (...args: any[]) => Error) {
  globalErrorManager.clear(errorClass);
}

/**
 * Clear all active errors.
 */
export function clearAllErrors() {
  globalErrorManager.clearAll();
}
