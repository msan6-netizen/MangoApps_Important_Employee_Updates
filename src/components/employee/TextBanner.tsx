import { useEffect, useRef, useState } from 'react';
import type { Reminder } from '../../types';
import { useApp } from '../../state/AppContext';
import { textsBetween } from '../../lib/reminders';
import { fmtDayTime } from '../../lib/time';

/**
 * Simulated SMS: when the demo clock moves past one of the viewer's reminder times, a text slides in.
 * Nothing is sent. Texts from before the viewer opened the app are not replayed.
 */
export function TextBanner() {
  const { state } = useApp();
  const me = state.viewerId;
  const seenUntil = useRef(state.now);
  const [texts, setTexts] = useState<Reminder[]>([]);

  useEffect(() => {
    if (state.now > seenUntil.current) {
      const arrived = textsBetween(me, state.posts, state.responses, state.employees, seenUntil.current, state.now);
      if (arrived.length) setTexts(arrived);
    }
    seenUntil.current = state.now;
  }, [state.now]);

  useEffect(() => {
    if (!texts.length) return;
    const t = setTimeout(() => setTexts([]), 9000);
    return () => clearTimeout(t);
  }, [texts]);

  if (!texts.length) return null;
  return (
    <div className="fixed inset-x-0 top-3 z-30 mx-auto w-[min(24rem,calc(100vw-2rem))] space-y-2" aria-live="polite">
      {texts.map((r) => {
        const post = state.posts.find((p) => p.id === r.postId)!;
        return (
          <div key={r.postId} data-testid="text-banner" className="animate-slide-down rounded-2xl bg-white/95 p-3 shadow-xl ring-1 ring-slate-200 backdrop-blur">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wide">💬 Text message · simulated</span>
              <button onClick={() => setTexts((x) => x.filter((y) => y !== r))} aria-label="Dismiss" className="px-1 text-base leading-none">×</button>
            </div>
            <p className="mt-1 text-sm text-slate-900">
              {/* No post details in a text: it only says something is waiting, and where. */}
              <span className="font-semibold">Summit:</span> You have a post to acknowledge by {fmtDayTime(post.ackBy!)}. Open the Summit app to read it.
            </p>
            <p className="mt-1 text-xs text-slate-400">{fmtDayTime(r.at)}</p>
          </div>
        );
      })}
    </div>
  );
}
