
// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
  const id=a.getAttribute('href'); if(id && id.length>1){ e.preventDefault(); const nav=document.querySelector('.navbar');
const gap=8;
const hh = nav ? nav.offsetHeight : 72;
const el=document.querySelector(id);
if(el){ const y=el.getBoundingClientRect().top + window.pageYOffset - hh - gap;
window.scrollTo({top:y, behavior:'smooth'}); }
}
}));

// Reveal on scroll
const obs=new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('show'); obs.unobserve(e.target);} });
},{threshold:0.1});
document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));

// Dark mode toggle
const root = document.documentElement;
const toggle = document.getElementById('darkModeToggle');
const applyTheme = (v)=>{ if(v==='dark'){ root.classList.add('dark'); toggle.textContent='☀️'; } else { root.classList.remove('dark'); toggle.textContent='🌙'; } };
let pref = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(pref);
toggle.addEventListener('click', ()=>{ pref = (pref==='dark'?'light':'dark'); localStorage.setItem('theme',pref); applyTheme(pref); });

// Parallax hero
window.addEventListener('scroll', ()=>{
  const sc = window.scrollY;
  const hero = document.querySelector('.hero');
  hero.style.backgroundPosition = `center ${-sc*0.1}px`;
});

// Animate meters when revealed
document.querySelectorAll('.meter .fill').forEach(el=>{
  el.style.width = '0';
});
const meterObs = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      const fills = e.target.querySelectorAll('.meter .fill');
      fills.forEach(f=>{
        const pct = f.dataset.progress || 0;
        requestAnimationFrame(()=>{ f.style.width = pct + '%'; });
      });
      meterObs.unobserve(e.target);
    }
  });
},{threshold:0.35});
document.querySelectorAll('.skills .grid, #skills').forEach(s=>meterObs.observe(s));

// burger toggle (safe)
document.addEventListener('click', function(e){
  var b = e.target.closest('.nav-toggle');
  if(!b) return;
  var exp = b.getAttribute('aria-expanded') === 'true';
  b.setAttribute('aria-expanded', String(!exp));
  document.documentElement.classList.toggle('nav-open', !exp);
});
function resetNav(){
  if ((window.innerWidth||document.documentElement.clientWidth) > 1024){
    document.documentElement.classList.remove('nav-open');
  }
}
window.addEventListener('resize', resetNav);
window.addEventListener('orientationchange', resetNav);

// ---- Compact zoom-rare bottom gap fixer (desktop only) ----
(function(){
  const footer = document.querySelector('#site-footer');
  if(!footer) return;
  const applyFix = ()=>{
    const doc = document.documentElement;
    const rect = footer.getBoundingClientRect();
    const footerBottom = rect.bottom + window.scrollY;
    const gap = doc.scrollHeight - footerBottom;
    if(gap > 50 && window.innerWidth >= 1024){
      footer.style.marginTop = `calc(${getComputedStyle(footer).marginTop} - ${gap}px)`;
    }else{
      footer.style.marginTop = '';
    }
  };
  ['load','resize','orientationchange'].forEach(ev=>window.addEventListener(ev, applyFix));
  setTimeout(applyFix, 0);
})();
