"""Original background track for the Meta reel (synthesised, no licence issues) + mouse clicks only.
Usage: python3 tools/tutorial/music_reel.py out.wav"""
import sys, wave, numpy as np
SR=44100; DUR=28.0; BPM=118; B=60/BPM
n=int(DUR*SR); L=np.zeros(n); R=np.zeros(n); rng=np.random.default_rng(3)
def env(m,a,d): t=np.arange(m)/SR; return np.minimum(1,t/a)*np.exp(-t/d)
def add(x,at,g=1,pan=0):
    i=int(at*SR)
    if i>=n: return
    j=min(n,i+len(x)); L[i:j]+=x[:j-i]*g*(1-pan); R[i:j]+=x[:j-i]*g*(1+pan)
def hz(m): return 440*2**((m-69)/12)
def kick():
    m=int(.35*SR); t=np.arange(m)/SR; f=48+90*np.exp(-t*30); return np.sin(2*np.pi*np.cumsum(f)/SR)*env(m,.002,.16)
def hat():
    m=int(.06*SR); x=rng.normal(0,1,m); x=x-np.convolve(x,np.ones(3)/3,'same'); return x*env(m,.001,.015)
def clap():
    m=int(.2*SR); x=rng.normal(0,1,m); x=np.convolve(x,np.ones(5)/5,'same'); return x*env(m,.002,.05)
def pluck(f,len_=.35):
    m=int(len_*SR); t=np.arange(m)/SR; return (np.sin(2*np.pi*f*t)+.4*np.sin(4*np.pi*f*t)+.15*np.sin(6*np.pi*f*t))*env(m,.003,.12)
def pad(fs,len_):
    m=int(len_*SR); t=np.arange(m)/SR; x=sum(np.sin(2*np.pi*f*t+np.sin(2*np.pi*.3*t))+.5*np.sin(2*np.pi*f*1.005*t) for f in fs)
    a=np.minimum(1,t/.4)*np.minimum(1,(len_-t)/.4); return x*a/len(fs)
def bass(f,len_):
    m=int(len_*SR); t=np.arange(m)/SR; x=np.tanh(2*np.sin(2*np.pi*f*t)); return x*env(m,.005,.35)
def click():
    m=int(.05*SR); x=rng.normal(0,1,m)*env(m,.0005,.006); x=np.convolve(x,np.ones(6)/6,'same')
    y=np.zeros(int(.09*SR)); y[:m]+=x; y[int(.028*SR):int(.028*SR)+m]+=.5*x; return y
prog=[(57,[57,60,64]),(53,[53,57,60]),(48,[48,52,55]),(55,[55,59,62])]  # Am F C G
bar=4*B; t=0; k=0
while t<DUR:
    root,ch=prog[k%4]
    add(pad([hz(m+12) for m in ch],bar+.3),t,.10)
    for s in range(8):                       # 8th-note bass + arp
        tt=t+s*B/2
        if tt>3.4 or s%2==0: add(bass(hz(root-12),B/2),tt,.20)
        if tt>3.5: add(pluck(hz(ch[s%3]+24 if s%4<2 else ch[(s+1)%3]+12)),tt,.07,pan=.3*(1 if s%2 else -1))
    for s in range(4):
        tt=t+s*B
        if tt>3.5 and tt<26.2: add(kick(),tt,.55)
        if tt>3.5 and s%2==1 and tt<26.2: add(clap(),tt,.12)
        add(hat(),tt+B/2,.10 if tt>3.5 else .05)
    t+=bar; k+=1
add(pad([hz(69),hz(72),hz(76),hz(81)],2.5),25.5,.14)      # ending chord
for c in [4.95,8.9,15.3,17.35,19.15]: add(click(),c,.9)    # mouse clicks only
for x in (L,R):
    fade=np.ones(n); fo=int(1.2*SR); fade[-fo:]=np.linspace(1,0,fo); fade[:int(.05*SR)]=np.linspace(0,1,int(.05*SR)); x*=fade
pk=max(abs(L).max(),abs(R).max()); st=np.stack([L,R],1)/pk*.85
with wave.open(sys.argv[1],'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes())
print('ok')
