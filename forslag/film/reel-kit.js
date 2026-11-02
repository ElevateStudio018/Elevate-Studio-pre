// Shared bits for the 9:16 reels: base CSS, the end card (offer + logo) and timing helpers.
(function(){
const css=`@font-face{font-family:H;src:url(../../assets/fonts/HankenGrotesk-latin.woff2) format('woff2');font-weight:100 900}
@font-face{font-family:F;src:url(../../assets/fonts/Fraunces-latin.woff2) format('woff2');font-style:italic;font-weight:100 900}
*{box-sizing:border-box;margin:0}
html,body{width:720px;height:1280px;overflow:hidden;background:#0d1d14;font-family:H,system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
#s{position:relative;width:720px;height:1280px;overflow:hidden}
.L{position:absolute;inset:0;opacity:0}
.w{font-weight:800;letter-spacing:-.04em;line-height:.98}
.hl{display:inline-block;padding:0 .14em;border-radius:.14em;background:#8fd3a6;color:#0f2418}
.serif{font-family:F,serif;font-style:italic;font-weight:400;letter-spacing:0}
.ctr{position:absolute;left:36px;right:36px;text-align:center}
#end{color:#fff;background:radial-gradient(70% 50% at 70% 22%,#1f4a33,transparent 70%),radial-gradient(60% 40% at 20% 88%,#173b28,transparent 70%),#0d1d14}
#end .kk{position:absolute;left:50%;top:190px;transform:translateX(-50%);padding:8px 18px;border-radius:999px;background:rgba(143,211,166,.16);border:1px solid rgba(143,211,166,.5);color:#bfe8cc;font-weight:800;font-size:18px;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
#end .pr{top:260px;font-size:58px}
#end .pr b{display:block;font-size:150px;letter-spacing:-.06em;margin-top:6px}
#end .tags{position:absolute;left:30px;right:30px;top:560px;display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
#end .tags span{padding:12px 22px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);font-weight:800;font-size:26px;opacity:0}
#end .cta{position:absolute;left:50%;top:790px;transform:translateX(-50%);padding:24px 48px;border-radius:999px;background:#8fd3a6;color:#0f2418;font-weight:800;font-size:32px;white-space:nowrap;box-shadow:0 0 60px rgba(143,211,166,.45)}
#end .lg{position:absolute;left:0;right:0;bottom:120px;display:flex;align-items:center;gap:14px;justify-content:center;font-weight:800;font-size:38px;letter-spacing:-.02em}
#end .lg img{height:34px}
#end .url{position:absolute;left:0;right:0;bottom:76px;text-align:center;font-size:24px;color:#c9d8cd}`;
const st=document.createElement('style');st.textContent=css;document.head.prepend(st);
const K=window.K={};
K.cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
K.ease=x=>{x=K.cl(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};
K.out=x=>{x=K.cl(x);return 1-Math.pow(1-x,3)};
K.io=(t,a,b,f=.35)=>K.cl(Math.min((t-a)/f,(b-t)/f));
K.typ=(el,s,t,a,sp=.05)=>{el.textContent=s.slice(0,K.cl(Math.floor((t-a)/sp),0,s.length))};
K.endHTML=`<div class="L" id="end"><div class="kk">Fast pris · klar snabbt</div>
<div class="ctr w pr">Hemsida från<b><span class="hl">2 999 kr</span></b></div>
<div class="tags"><span>SEO</span><span>Design</span><span>Recensioner</span><span>Admin</span></div>
<div class="cta">Boka gratismöte →</div>
<div class="lg"><img src="../../assets/img/brand/logo-mark-cream.svg" alt="">Elevate Studio</div><div class="url">elevatestudio.nu</div></div>`;
K.end=(t,a)=>{const e=document.getElementById('end');e.style.opacity=K.cl((t-a)/.4);
 e.querySelector('.pr').style.transform=`scale(${1.1-.1*K.out((t-a)/.6)})`;
 e.querySelectorAll('.tags span').forEach((s,i)=>{const k=K.cl((t-a-.6-i*.18)/.25);s.style.opacity=k;s.style.transform=`translateY(${(1-k)*16}px)`});
 const k=t-a-1.8;e.querySelector('.cta').style.transform=`translateX(-50%) scale(${1+(k>0?.05*Math.max(0,Math.sin(k*Math.PI/.7)):0)})`};
K.boot=(render,DUR,imgs=[])=>{
 window.READY=Promise.all(['../../assets/img/brand/logo-mark-cream.svg',...imgs].map(u=>new Promise(ok=>{const im=new Image();im.onload=im.onerror=()=>im.decode?im.decode().then(ok,ok):ok();im.src=u;(window.__p=window.__p||[]).push(im)})).concat([document.fonts.ready]));
 window.render=render;window.DUR=DUR;
 if(!/capture/.test(location.search)){let t0=performance.now();(function loop(){render(((performance.now()-t0)/1000)%DUR);requestAnimationFrame(loop)})()}};
})();
