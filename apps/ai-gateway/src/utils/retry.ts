export interface RetryOptions {
  readonly attempts: number;
  readonly delayMs?: number;
  readonly shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Retry an async operation with a fixed delay.
 *
 * @param operation Operation to execute.
 * @param options Retry behavior.
 * @returns Operation result.
 * @throws The final operation error when attempts are exhausted.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const attempts = Math.max(1, options.attempts);
  const delayMs = options.delayMs ?? 250;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const isFinalAttempt = attempt >= attempts;
      const shouldRetry = options.shouldRetry?.(error, attempt) ?? true;

      if (isFinalAttempt || !shouldRetry) {
        throw error;
      }

      await wait(delayMs);
    }
  }

  throw new Error("Retry loop exited unexpectedly");
}

function wait(delayMs: number): Promise<void> {
  if (delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolveWait) => {
    setTimeout(resolveWait, delayMs);
  });
}
