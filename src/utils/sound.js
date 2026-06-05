let audioContext = null;

function getAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContext) audioContext = new AudioCtx();
  return audioContext;
}

export async function unlockTransactionSound() {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
  return ctx.state === 'running';
}

export async function playTransactionSound(enabled = true, tone = 'success') {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
  if (ctx.state !== 'running') return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  const osc = ctx.createOscillator();
  const second = ctx.createOscillator();

  const base = tone === 'delete' ? 220 : tone === 'error' ? 180 : 560;
  const next = tone === 'delete' ? 164 : tone === 'error' ? 140 : 760;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

  osc.type = 'sine';
  second.type = 'triangle';
  osc.frequency.setValueAtTime(base, now);
  second.frequency.setValueAtTime(next, now + 0.06);

  osc.connect(gain);
  second.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.11);
  second.start(now + 0.055);
  second.stop(now + 0.17);
}
