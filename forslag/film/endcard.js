// Shared end card for all reels (website style: dotted green, white card with rows, italic price).
(function(){
const st=document.createElement('style');st.textContent=`
.ec{position:absolute;inset:0;opacity:0;z-index:50;text-align:center;color:#fff;font-family:H,sans-serif;background-color:#12271b;background-image:radial-gradient(rgba(255,255,255,.09) 1px,transparent 1.4px);background-size:6px 6px}
.ec .k{position:absolute;left:0;right:0;top:150px;font-size:17px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#c9d8cd;transform:none;background:none;padding:0;border-radius:0}
.ec .h{position:absolute;left:40px;right:40px;top:215px;font-size:74px;font-weight:700;letter-spacing:-.035em;line-height:1.02}
.ec .h i{font-family:F,serif;font-style:italic;font-weight:400;color:#cfe9d6}
.ec .s{position:absolute;left:40px;right:40px;top:430px;font-size:25px;color:#c9d8cd}
.ec .c{position:absolute;left:56px;right:56px;top:540px;background:#fff;color:#12261a;border-radius:32px;overflow:hidden;text-align:left}
.ec .c div.r{display:flex;align-items:baseline;gap:16px;padding:22px 44px;font-size:26px;border-bottom:1px solid #e3e7e3}
.ec .c div.r:before{content:'';flex:none;width:10px;height:10px;border-radius:50%;background:#2f7d4f;transform:translateY(-3px)}
.ec .c div.r:nth-child(4){border:0}
.ec .b{display:block;width:fit-content;margin:16px auto 34px;height:80px;line-height:80px;padding:0 44px;border-radius:999px;background:#1d3b2a;color:#fff;font-weight:700;font-size:28px}
.ec .lg{position:absolute;left:0;right:0;bottom:120px;display:flex;align-items:center;justify-content:center;gap:12px;font-weight:700;font-size:32px;letter-spacing:-.02em}.ec .lg img{height:28px}
.ec .u{position:absolute;left:0;right:0;bottom:78px;font-size:23px;opacity:.75}`;
document.head.appendChild(st);
const base=(document.currentScript&&document.currentScript.src)||location.href;const A=new URL('../../assets/img/brand/logo-mark-cream.svg',base).href;
window.ENDCARD=`<div class="ec" id="ec"><div class="k">— Klar idag —</div><div class="h">Få din hemsida<br>idag från <i>2 999 kr</i></div><div class="s">SEO · Design · Recensioner · Admin</div>
<div class="c"><div class="r">Unik design efter ditt företag</div><div class="r">Snabb och mobilanpassad</div><div class="r">SEO – synlig på Google</div><div class="r">Recensioner och adminpanel</div><span class="b">Boka gratismöte →</span></div>
<div class="lg"><img src="${A}">Elevate Studio</div><div class="u">elevatestudio.nu</div></div>`;
const cl=(x)=>Math.max(0,Math.min(1,x)),out=x=>1-Math.pow(1-cl(x),3);
window.endAnim=(t,a)=>{const e=document.getElementById('ec');if(!e)return;e.style.opacity=cl((t-a)/.35);
 const h=e.querySelector('.h');h.style.transform=`translateY(${(1-out((t-a)/.6))*24}px)`;
 e.querySelector('.s').style.opacity=cl((t-a-.3)/.3);
 const c=e.querySelector('.c');c.style.transform=`translateY(${(1-out((t-a-.35)/.5))*40}px)`;c.style.opacity=cl((t-a-.35)/.3);
 e.querySelectorAll('.r').forEach((r,i)=>{const k=cl((t-a-.6-i*.14)/.25);r.style.opacity=k});
 const k=t-a-1.6;e.querySelector('.b').style.transform=`scale(${1+(k>0?.04*Math.max(0,Math.sin(k*Math.PI/.7)):0)})`;};
})();
