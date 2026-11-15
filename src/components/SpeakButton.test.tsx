import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpeakButton } from './SpeakButton';
const audio = vi.hoisted(() => ({ canSpeak: vi.fn(() => true), speak: vi.fn() }));
vi.mock('@/lib/speech', () => audio);
describe('SpeakButton latest attempt ownership', () => {
  let host: HTMLDivElement; let root: Root;
  const renderButton = async () => { await act(async () => root.render(<SpeakButton text='Hello' />)); return host.querySelector('button')!; };
  const clickTwice = async (b: HTMLButtonElement) => { await act(async () => b.click()); await act(async () => b.click()); };
  const attempts: { resolve(): void; reject(e: Error): void }[] = [];
  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    attempts.length = 0; audio.canSpeak.mockReturnValue(true);
    audio.speak.mockImplementation(() => new Promise<void>((resolve, reject) => attempts.push({ resolve, reject })));
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.clearAllMocks(); });
  it('clears the previous exercise error when its text changes', async () => {
    const b = await renderButton();
    await act(async () => b.click());
    await act(async () => attempts[0].reject(new Error('previous exercise')));
    expect(host.querySelector('[role=alert]')).not.toBeNull();
    await act(async () => root.render(<SpeakButton text='Goodbye' />));
    expect(host.querySelector('[role=alert]')).toBeNull();
    expect(host.querySelector('button')).toHaveAttribute('aria-busy', 'false');
  });
  it('ignores a pending attempt after changing exercise content', async () => {
    const b = await renderButton();
    await act(async () => b.click());
    await act(async () => root.render(<SpeakButton text='Goodbye' />));
    expect(host.querySelector('button')).toHaveAttribute('aria-busy', 'false');
    await act(async () => attempts[0].reject(new Error('old exercise')));
    expect(host.querySelector('[role=alert]')).toBeNull();
  });
  it('keeps the second playback busy when the interrupted first attempt completes', async () => {
    const b = await renderButton();
    await clickTwice(b);
    expect(b).toHaveAttribute('aria-busy', 'true');
    await act(async () => attempts[0].resolve());
    expect(b).toHaveAttribute('aria-busy', 'true');
    await act(async () => attempts[1].resolve());
    expect(b).toHaveAttribute('aria-busy', 'false');
  });
  it('does not remain busy when a new attempt finds audio unavailable', async () => {
    const b = await renderButton();
    await act(async () => b.click());
    audio.canSpeak.mockReturnValue(false);
    await act(async () => b.click());
    expect(b).toHaveAttribute('aria-busy', 'false');
    expect(host.querySelector('[role=alert]')).not.toBeNull();
    await act(async () => attempts[0].resolve());
    expect(b).toHaveAttribute('aria-busy', 'false');
  });
  it('still reports an error on the current playback', async () => {
    const b = await renderButton();
    await act(async () => b.click());
    await act(async () => attempts[0].reject(new Error('current failure')));
    expect(host.querySelector('[role=alert]')).not.toBeNull();
    expect(b).toHaveAttribute('aria-busy', 'false');
  });
  it('ignores callbacks from an unmounted instance', async () => {
    const b = await renderButton();
    await act(async () => b.click());
    await act(async () => root.render(null));
    await act(async () => attempts[0].reject(new Error('late after exit')));
    expect(host.textContent).toBe('');
  });
  it('ignores a late error from the previous attempt', async () => {
    const b = await renderButton();
    await clickTwice(b);
    await act(async () => attempts[0].reject(new Error('old failure')));
    expect(host.querySelector('[role=alert]')).toBeNull();
    expect(b).toHaveAttribute('aria-busy', 'true');
    await act(async () => attempts[1].resolve());
  });
});
