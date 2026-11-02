"""Sound effects for the ad film: mouse clicks, key taps, whooshes, pops, pings and a success chime.
Synthesised here (no sound files with unclear licences), placed at the film's event times.
Usage: python3 tools/tutorial/sfx.py out.wav  (events for reklam6.html are listed below)
"""
import sys, wave, numpy as np

SR = 44100
DUR = 69.6
rng = np.random.default_rng(7)


def env(n, a=0.002, d=0.08):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
    return e


def click():          # a short, soft mouse click: two tiny filtered noise bursts
    n = int(0.05 * SR); x = rng.normal(0, 1, n) * env(n, 0.0005, 0.006)
    x = np.convolve(x, np.ones(6) / 6, 'same')
    y = np.zeros(int(0.07 * SR)); y[:n] += x; y[int(0.028 * SR):int(0.028 * SR) + n] += 0.5 * x
    return 0.5 * y


def key():            # a quiet keyboard tap
    n = int(0.03 * SR); x = rng.normal(0, 1, n) * env(n, 0.0003, 0.004)
    return 0.16 * np.convolve(x, np.ones(4) / 4, 'same') * rng.uniform(0.7, 1.1)


def tone(f, length, d, vol, f2=None):
    n = int(length * SR); t = np.arange(n) / SR
    ff = f if f2 is None else np.linspace(f, f2, n)
    ph = 2 * np.pi * np.cumsum(ff) / SR
    return vol * np.sin(ph) * env(n, 0.004, d)


def pop():
    return tone(520, 0.12, 0.035, 0.22, 880)


def ping():            # new mail / notification
    return tone(1320, 0.5, 0.18, 0.18) + tone(1980, 0.5, 0.12, 0.08)


def chime():           # success: two notes
    a = tone(784, 0.5, 0.2, 0.2); b = tone(1175, 0.7, 0.28, 0.2)
    y = np.zeros(int(0.9 * SR)); y[:len(a)] += a; s = int(0.11 * SR); y[s:s + len(b)] += b
    return y


def whoosh():
    n = int(0.45 * SR); x = rng.normal(0, 1, n)
    t = np.arange(n) / n; e = np.sin(np.pi * t) ** 2
    k = np.ones(40) / 40; x = np.convolve(x, k, 'same')
    return 0.35 * x * e


def buzz():            # error
    return tone(140, 0.22, 0.12, 0.16) + tone(147, 0.22, 0.12, 0.12)


def tick():
    return tone(2200, 0.03, 0.008, 0.05)


track = np.zeros(int(DUR * SR) + SR)


def put(sound, at, gain=1.0):
    i = int(at * SR)
    if i < 0 or i >= len(track): return
    j = min(len(track), i + len(sound)); track[i:j] += gain * sound[:j - i]


def typing(a, b, every=0.075):
    t = a
    while t < b:
        put(key(), t); t += every * rng.uniform(0.7, 1.3)


SCENES = [2.4, 7.2, 9.8, 17.4, 25.4, 33.4, 39.6, 54, 58.2, 63, 65.6]
CLICKS = [18.25, 19.15, 20.0, 21.3, 29.1, 29.6, 31.9, 35.0, 35.95, 38.35, 40.6, 42.35, 47.1, 48.75, 51.5]
for s in SCENES: put(whoosh(), s - 0.15, 0.8)
for c in CLICKS: put(click(), c)
for w in [0, 0.55, 1.1, 1.65]: put(pop(), w, 0.8)                         # the opening words
typing(2.7, 5.2, 0.06)                                                     # the messy terminal
for e in [4.0, 4.35, 4.7, 5.0]: put(buzz(), e)
put(buzz(), 6.3, 1.2)                                                      # "Krångligt."
typing(10.3, 14.0, 0.09)                                                   # we code the site
typing(18.3, 18.85); typing(29.6, 31.0); typing(31.2, 31.6); typing(36.4, 38.0); typing(40.6, 41.8)
for i in range(5): put(pop(), 19.35 + i * 0.1, 0.6)                        # domain rows
put(pop(), 20.6, 0.8); put(chime(), 22.5)                                  # package, order done
put(pop(), 28.3, 0.8)                                                      # the form appears
put(chime(), 31.95, 0.8)                                                   # request sent
put(ping(), 33.6)                                                          # it lands in Elevate Mejl
put(chime(), 38.4, 0.8)                                                    # reply sent
for i in range(6): put(tick(), 43.6 + i * 0.25)                            # the test rings fill
for i in range(3): put(pop(), 49.2 + i * 0.55, 0.7)                        # AI suggestions
put(chime(), 51.55)                                                        # published
t = 58.7
while t < 61.2: put(tick(), t, 0.7); t += 0.06                             # revenue counts up
put(chime(), 61.2, 1.1)                                                    # and stops at 112 954 kr
for d in [59.2, 60.0, 60.8]: put(pop(), d, 0.7)
put(chime(), 66.6, 0.7)                                                    # logo

track = np.tanh(track * 1.2) * 0.85
pcm = (np.clip(track, -1, 1) * 32767).astype(np.int16)
stereo = np.repeat(pcm[:, None], 2, axis=1)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'sfx.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(stereo.tobytes())
print('ok', len(pcm) / SR, 's')
