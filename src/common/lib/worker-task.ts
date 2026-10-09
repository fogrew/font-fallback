export type TaskWorker = Pick<
  Worker,
  'onmessage' | 'onerror' | 'onmessageerror' | 'postMessage' | 'terminate'
>;

export class WorkerTaskError extends Error {
  constructor(public readonly code: 'timeout' | 'worker-error' | 'aborted') {
    super(code);
    this.name = 'WorkerTaskError';
  }
}

export function runWorkerTask<Request, Response>(
  createWorker: () => TaskWorker,
  request: Request,
  options: { timeoutMs: number; transfer?: Transferable[]; signal?: AbortSignal },
): Promise<Response> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new WorkerTaskError('aborted'));
      return;
    }
    let worker: TaskWorker | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
      if (worker) {
        worker.onmessage = null;
        worker.onerror = null;
        worker.onmessageerror = null;
        worker.terminate();
      }
    };
    const fail = (code: WorkerTaskError['code']) => {
      cleanup();
      reject(new WorkerTaskError(code));
    };
    const abort = () => fail('aborted');
    try {
      worker = createWorker();
      worker.onmessage = (event: MessageEvent<Response>) => {
        cleanup();
        resolve(event.data);
      };
      worker.onerror = () => fail('worker-error');
      worker.onmessageerror = () => fail('worker-error');
      timer = setTimeout(() => fail('timeout'), options.timeoutMs);
      options.signal?.addEventListener('abort', abort, { once: true });
      worker.postMessage(request, options.transfer ?? []);
    } catch {
      fail('worker-error');
    }
  });
}
