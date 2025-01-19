export function assert(expr: any, msg = 'unknown assertion error') {
  if (!Boolean(expr)) throw new Error(msg);
}
