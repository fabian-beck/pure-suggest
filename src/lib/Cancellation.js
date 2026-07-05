/**
 * Creates a cancellation token that can be used to interrupt long-running loading operations.
 * Awaiting `Promise.race([someLoadingPromise, token.promise])` lets the caller stop waiting
 * as soon as `cancel()` is called, while any in-flight requests keep running in the background.
 * @returns {{promise: Promise<void>, cancel: Function, isCancelled: boolean}} The cancellation token.
 */
export function createCancellationToken() {
  let cancelled = false
  let resolveFn
  const promise = new Promise((resolve) => {
    resolveFn = resolve
  })

  return {
    promise,
    cancel() {
      cancelled = true
      resolveFn()
    },
    get isCancelled() {
      return cancelled
    }
  }
}
