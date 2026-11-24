/* Versall homepage interactions
   - live noisy gradient (WebGL) in the hero, bends toward the cursor
   - frosted lens following the cursor in the hero
   - tilt + highlight on venture cards
   - statement text that fills in as you scroll
   - compact header after the hero
   Everything degrades to a static page without JS or with reduced motion. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  /* ---------- Film grain tile ---------- */
  try {
    const s = 160, c = document.createElement('canvas');
    c.width = c.height = s;
    const x = c.getContext('2d'), im = x.createImageData(s, s);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = Math.random() * 255 | 0;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    document.documentElement.style.setProperty('--grain', `url(${c.toDataURL()})`);
  } catch (e) { /* grain is decorative */ }

  /* ---------- Hero gradient (WebGL) ---------- */
  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = `precision highp float;
uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform float uGrain;uniform float uScale;
uniform vec3 uC0;uniform vec3 uC1;uniform vec3 uC2;uniform vec3 uC3;
vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}
float snoise(vec2 v){const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.0);
vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;
vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;
m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.0*dot(m,g);}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;
  vec2 p=vec2(uv.x*asp,uv.y)*uScale;vec2 m=vec2(uMouse.x*asp,uMouse.y)*uScale;
  float d=distance(p,m);p+=(p-m)*0.35*exp(-d*d*2.2);
  float t=uTime*0.05;
  vec2 q=vec2(snoise(p*0.55+vec2(0.0,t)),snoise(p*0.55+vec2(5.2,-t)));
  vec2 r=vec2(snoise(p*0.6+0.55*q+vec2(1.7,9.2)+t*0.6),snoise(p*0.6+0.55*q+vec2(8.3,2.8)-t*0.45));
  float n=snoise(p*0.5+0.45*r);
  vec3 col=mix(uC0,uC1,smoothstep(-0.8,0.8,q.x));
  col=mix(col,uC2,smoothstep(-0.35,0.75,r.y));
  col=mix(col,uC3,smoothstep(0.2,0.95,n)*0.75);
  col+=(hash(gl_FragCoord.xy+fract(uTime*7.0)*91.0)-0.5)*uGrain;
  gl_FragColor=vec4(col,1.0);
}`;
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

  function gradient(canvas, cfg) {
    let gl = null;
    try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }); } catch (e) {}
    if (!gl) { canvas.remove(); return; }
    const sh = (type, src) => {
      const o = gl.createShader(type);
      gl.shaderSource(o, src); gl.compileShader(o);
      return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null;
    };
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) { canvas.remove(); return; }
    const pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { canvas.remove(); return; }
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = n => gl.getUniformLocation(pr, n);
    const u = { res: U('uRes'), t: U('uTime'), m: U('uMouse') };
    ['uC0', 'uC1', 'uC2', 'uC3'].forEach((n, i) => gl.uniform3fv(U(n), hex(cfg.colors[i])));
    gl.uniform1f(U('uGrain'), cfg.grain);
    gl.uniform1f(U('uScale'), cfg.scale);

    const st = { m: [.55, .45], tm: [.55, .45], t: cfg.seed, vis: false, raf: 0, last: 0 };
    const host = canvas.parentElement;
    const draw = () => {
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.t, st.t);
      gl.uniform2f(u.m, st.m[0], st.m[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const resize = () => {
      const d = Math.min(devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(host.clientWidth * d));
      const h = Math.max(1, Math.round(host.clientHeight * d));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      draw();
    };
    const loop = now => {
      if (!st.vis || document.hidden) { st.raf = 0; return; }
      const dt = Math.min(.05, (now - (st.last || now)) / 1000);
      st.last = now;
      st.t += dt * cfg.speed;
      st.m[0] += (st.tm[0] - st.m[0]) * .045;
      st.m[1] += (st.tm[1] - st.m[1]) * .045;
      draw();
      st.raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (reduce) { draw(); return; }
      if (!st.raf && st.vis && !document.hidden) { st.last = 0; st.raf = requestAnimationFrame(loop); }
    };
    host.addEventListener('pointermove', e => {
      const r = host.getBoundingClientRect();
      st.tm = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
      if (reduce) { st.m = st.tm.slice(); draw(); }
    });
    new ResizeObserver(resize).observe(host);
    new IntersectionObserver(es => { st.vis = es[0].isIntersecting; kick(); }).observe(host);
    document.addEventListener('visibilitychange', kick);
    resize();
  }

  const heroCanvas = document.querySelector('.hero-gl');
  if (heroCanvas) {
    gradient(heroCanvas, {
      colors: ['#1C3FF5', '#4AA6FF', '#C3B8FF', '#EAE6FF'], // electric blue, sky, lavender, mist
      scale: 1.0, grain: .11, speed: 1, seed: 3
    });
  }

  /* ---------- Hero lens ---------- */
  const hero = document.querySelector('.hero');
  const lens = document.querySelector('.lens');
  if (hero && lens && fine && !reduce) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      lens.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px)`;
      lens.classList.add('on');
    });
    hero.addEventListener('pointerleave', () => lens.classList.remove('on'));
  }

  /* ---------- Card tilt ---------- */
  if (fine && !reduce) {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', ((x - .5) * 10).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((.5 - y) * 8).toFixed(2) + 'deg');
        card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Statement fill on scroll ---------- */
  const stmt = document.querySelector('.statement p');
  let words = [];
  if (stmt) {
    stmt.innerHTML = stmt.textContent.trim().split(/\s+/).map(w => `<span>${w}</span>`).join(' ');
    words = [...stmt.children];
    if (reduce) words.forEach(w => w.classList.add('lit'));
  }
  const fillStatement = () => {
    if (!stmt || reduce) return;
    const r = stmt.getBoundingClientRect(), vh = innerHeight;
    const p = Math.min(1, Math.max(0, (vh * .85 - r.top) / (r.height + vh * .3)));
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('lit', i < n));
  };

  /* ---------- Floating header ---------- */
  const floatNav = document.querySelector('.float-nav');
  const floatLinks = floatNav ? [...floatNav.querySelectorAll('a')] : [];
  let navShown = false;
  const toggleNav = () => {
    if (!floatNav || !hero) return;
    const show = hero.getBoundingClientRect().bottom < 80;
    if (show === navShown) return;
    navShown = show;
    floatNav.classList.toggle('show', show);
    floatNav.setAttribute('aria-hidden', String(!show));
    floatLinks.forEach(a => a.tabIndex = show ? 0 : -1);
  };

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { fillStatement(); toggleNav(); ticking = false; });
  }, { passive: true });
  fillStatement();
  toggleNav();

  /* ---------- Footer year ---------- */
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
