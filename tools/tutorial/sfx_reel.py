"""Sound effects for the ad film: mouse clicks, key taps, whooshes, pops, pings and a success chime.
Synthesised here (no sound files with unclear licences), placed at the film's event times.
Usage: python3 tools/tutorial/sfx.py out.wav  (events for reklam6.html are listed below)
"""
import sys, wave, numpy as np

SR = 44100
DUR = 26
rng = np.random.default_rng(7)


def env(n, a=0.002, d=0.08):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
    return e


def click():          # a short, soft mouse click: two tiny filtered noise bursts
    n = int(0.05 * SR); x = rng.normal(0, 1, n) * env(n, 0.0005, 0.006)
    x = np.convolve(x, np.ones(6) / 6, 'same')
    y = np.zeros(int(0.09 * SR)); y[:n] += x; y[int(0.028 * SR):int(0.028 * SR) + n] += 0.5 * x
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


for w in [3.5,8.85,13.85,18.7]: put(whoosh(), w-.15, .8)
put(pop(),.2,.9); put(pop(),1.0,.7)
typing(4.3,5.1); put(click(),5.25)
for i in range(3): put(tick(),5.8+i*.15)
for i in range(3): put(pop(),6.4+i*.18,.6)
put(chime(),7.3,.8)
typing(9.3,10.4,.05); put(click(),10.45); put(chime(),11.8,.7)
put(click(),14.95); typing(15.4,16.4); put(click(),15.95); put(click(),16.95); put(ping(),17.0)
for i in range(4): put(pop(),19.8+i*.3,.6)
put(chime(),22.4,1.0)
track = np.tanh(track * 1.2) * 0.85
pcm = (np.clip(track, -1, 1) * 32767).astype(np.int16)
stereo = np.repeat(pcm[:, None], 2, axis=1)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(stereo.tobytes())
