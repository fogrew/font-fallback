import { afterEach, describe, expect, it, vi } from 'vitest';
import { runWorkerTask } from './worker-task';

class TestWorker {
  onmessage: Worker['onmessage'] = null;
  onerror: Worker['onerror'] = null;
  onmessageerror: Worker['onmessageerror'] = null;
  terminate = vi.fn();
  postMessage = vi.fn();

  reply(data: unknown) {
    this.onmessage?.call(this as unknown as Worker, new MessageEvent('message', { data }));
  }
}

afterEach(() => vi.useRealTimers());

describe('worker task lifecycle', () => {
  it('resolves a reply and releases the worker', async () => {
    const worker = new TestWorker();
    const result = runWorkerTask<number, string>(() => worker, 42, { timeoutMs: 1000 });
    worker.reply('parsed');
    await expect(result).resolves.toBe('parsed');
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(worker.onmessage).toBeNull();
  });

  it('terminates a stalled worker on a main-thread timer', async () => {
    vi.useFakeTimers();
    const worker = new TestWorker();
    const result = runWorkerTask(() => worker, 42, { timeoutMs: 10 });
    const failure = expect(result).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(10);
    await failure;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('releases an active worker when its owner is disposed', async () => {
    const worker = new TestWorker();
    const controller = new AbortController();
    const result = runWorkerTask(() => worker, 42, { timeoutMs: 1000, signal: controller.signal });
    controller.abort();
    await expect(result).rejects.toMatchObject({ code: 'aborted' });
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it.each(['onerror', 'onmessageerror'] as const)(
    'rejects %s without leaking a worker',
    async (event) => {
      const worker = new TestWorker();
      const result = runWorkerTask(() => worker, 42, { timeoutMs: 1000 });
      const handler = worker[event] as (() => void) | null;
      handler?.();
      await expect(result).rejects.toMatchObject({ code: 'worker-error' });
      expect(worker.terminate).toHaveBeenCalledOnce();
    },
  );

  it('reports worker creation and postMessage failures', async () => {
    await expect(
      runWorkerTask(
        () => {
          throw new Error('blocked by CSP');
        },
        42,
        { timeoutMs: 1000 },
      ),
    ).rejects.toMatchObject({ code: 'worker-error' });
    const worker = new TestWorker();
    worker.postMessage.mockImplementation(() => {
      throw new Error('clone failed');
    });
    await expect(runWorkerTask(() => worker, 42, { timeoutMs: 1000 })).rejects.toMatchObject({
      code: 'worker-error',
    });
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
