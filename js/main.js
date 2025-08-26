
// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
  const id=a.getAttribute('href'); if(id && id.length>1){ e.preventDefault(); document.querySelector(id).scrollIntoView({behavior:'smooth'}); }
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
