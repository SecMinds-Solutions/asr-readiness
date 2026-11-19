import { act, renderHook, waitFor } from '@testing-library/react';
import { useLoad } from './useLoad';

describe('useLoad', () => {
  it('loads once, and keeps when it was loaded', async () => {
    const load = vi.fn(async () => 'value');
    const { result } = renderHook(() => useLoad(load));
    expect(result.current.state).toEqual({ status: 'loading' });
    await waitFor(() => expect(result.current.state.status).toBe('loaded'));
    expect(result.current.state).toMatchObject({ status: 'loaded', value: 'value', at: expect.any(Date) });
    expect(load).toHaveBeenCalledOnce();
  });

  it('keeps the message of a failed load, and loads again on reload', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('Too many requests')).mockResolvedValueOnce('value');
    const { result } = renderHook(() => useLoad(load));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'failed', message: 'Too many requests' }));
    act(() => result.current.reload());
    expect(result.current.state).toEqual({ status: 'loading' });
    await waitFor(() => expect(result.current.state.status).toBe('loaded'));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not load while there is nothing to load yet, and starts once there is', async () => {
    const load = vi.fn(async () => 'value');
    const { result, rerender } = renderHook(({ ready }) => useLoad(ready ? load : null), { initialProps: { ready: false } });
    act(() => result.current.reload());
    expect(load).not.toHaveBeenCalled();
    expect(result.current.state).toEqual({ status: 'loading' });
    rerender({ ready: true });
    await waitFor(() => expect(result.current.state.status).toBe('loaded'));
    expect(load).toHaveBeenCalledOnce();
  });
});
