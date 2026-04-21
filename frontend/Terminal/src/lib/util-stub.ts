// Stub for Node.js util module for browser compatibility
// Provides no-op implementations for browser environment

export const debuglog = () => () => {};
export const inspect = (obj: any) => String(obj);
export const format = (...args: any[]) => args.join(' ');
export const inherits = () => {};
export const deprecate = (fn: Function) => fn;

export default {
  debuglog,
  inspect,
  format,
  inherits,
  deprecate,
};
