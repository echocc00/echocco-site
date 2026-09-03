// echocc00 — WebGL strands (multi-instance)
// Detects all .hero-strands-canvas / .ambient-strands-canvas elements.
// Each gets its own WebGL context, particle system, and config.
(function() {
  'use strict';
  if (window.__echoccoStrandsStarted) return; window.__echoccoStrandsStarted = true;

  const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduce) return;

  // Shared shader sources
  const VsPoint = `
    attribute vec2 a_pos;
    attribute float a_size;
    attribute float a_alpha;
    uniform vec2 u_resolution;
    uniform float u_dpr;
    varying float v_alpha;
    void main() {
      vec2 clip = (a_pos / u_resolution) * 2.0 - 1.0;
      gl_Position = vec4(clip * vec2(1.0, -1.0), 0.0, 1.0);
      gl_PointSize = a_size * u_dpr;
      v_alpha = a_alpha;
    }
  `;
  const FsPoint = `
    precision mediump float;
    varying float v_alpha;
    uniform vec3 u_color;
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      float d = length(c);
      if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.0, d) * v_alpha;
      gl_FragColor = vec4(u_color, a);
    }
  `;
  const VsLine = `
    attribute vec2 a_pos;
    attribute float a_alpha;
    uniform vec2 u_resolution;
    varying float v_alpha;
    void main() {
      vec2 clip = (a_pos / u_resolution) * 2.0 - 1.0;
      gl_Position = vec4(clip * vec2(1.0, -1.0), 0.0, 1.0);
      v_alpha = a_alpha;
    }
  `;
  const FsLine = `
    precision mediump float;
    varying float v_alpha;
    uniform vec3 u_color;
    void main() {
      gl_FragColor = vec4(u_color, v_alpha);
    }
  `;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
    return s;
  }
  function makeProgram(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    return p;
  }

  function initCanvas(canvas) {
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) return null;

    // Per-instance config from data-attrs
    const count = parseInt(canvas.dataset.count || '120', 10);
    const linkDist = parseInt(canvas.dataset.linkDist || '120', 10);
    const lineColor = (canvas.dataset.lineColor || '#6366f1').slice(1);
    const pointColor = (canvas.dataset.pointColor || '#22c55e').slice(1);
    const speed = parseFloat(canvas.dataset.speed || '1');
    const maxLines = parseInt(canvas.dataset.maxLines || '1500', 10);
    const lineR = parseInt(lineColor.substr(0,2), 16) / 255;
    const lineG = parseInt(lineColor.substr(2,2), 16) / 255;
    const lineB = parseInt(lineColor.substr(4,2), 16) / 255;
    const pointR = parseInt(pointColor.substr(0,2), 16) / 255;
    const pointG = parseInt(pointColor.substr(2,2), 16) / 255;
    const pointB = parseInt(pointColor.substr(4,2), 16) / 255;

    const pointProgram = makeProgram(gl, compile(gl, gl.VERTEX_SHADER, VsPoint), compile(gl, gl.FRAGMENT_SHADER, FsPoint));
    const lineProgram = makeProgram(gl, compile(gl, gl.VERTEX_SHADER, VsLine), compile(gl, gl.FRAGMENT_SHADER, FsLine));
    if (!pointProgram || !lineProgram) return null;

    const pointVerts = new Float32Array(count * 4);
    const pointBuf = gl.createBuffer();
    const LINE_BUDGET = Math.min(maxLines, count * count);
    const lineVerts = new Float32Array(LINE_BUDGET * 6);
    const lineIndices = new Uint16Array(LINE_BUDGET * 2);
    const lineBuf = gl.createBuffer();

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.15 * speed,
        vy: (Math.random() - 0.5) * 0.15 * speed,
        size: 1.5 + Math.random() * 2.5,
        baseAlpha: 0.4 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const mouse = { x: -1000, y: -1000, active: false };
    function bindMouse() {
      window.addEventListener('pointermove', (e) => {
        mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
      }, { passive: true });
      window.addEventListener('pointerleave', () => { mouse.active = false; mouse.x = -1000; mouse.y = -1000; });
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    bindMouse();
    window.addEventListener('resize', resize);

    const u_res_point = gl.getUniformLocation(pointProgram, 'u_resolution');
    const u_color_point = gl.getUniformLocation(pointProgram, 'u_color');
    const u_dpr_point = gl.getUniformLocation(pointProgram, 'u_dpr');
    const u_res_line = gl.getUniformLocation(lineProgram, 'u_resolution');
    const u_color_line = gl.getUniformLocation(lineProgram, 'u_color');
    const a_pos_point = gl.getAttribLocation(pointProgram, 'a_pos');
    const a_size_point = gl.getAttribLocation(pointProgram, 'a_size');
    const a_alpha_point = gl.getAttribLocation(pointProgram, 'a_alpha');
    const a_pos_line = gl.getAttribLocation(lineProgram, 'a_pos');
    const a_alpha_line = gl.getAttribLocation(lineProgram, 'a_alpha');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    return { gl, w, h, count, linkDist, LINK_DIST_SQ: linkDist*linkDist, LINE_BUDGET, particles, mouse, pointVerts, lineVerts, lineIndices, pointBuf, lineBuf, pointProgram, lineProgram, u_res_point, u_color_point, u_dpr_point, u_res_line, u_color_line, a_pos_point, a_size_point, a_alpha_point, a_pos_line, a_alpha_line, lineR, lineG, lineB, pointR, pointG, pointB, DPR };
  }

  function renderInstance(inst, now) {
    const { gl, w, h, count, linkDist, LINK_DIST_SQ, LINE_BUDGET, particles, mouse, pointVerts, lineVerts, lineIndices, pointBuf, lineBuf, pointProgram, lineProgram, u_res_point, u_color_point, u_dpr_point, u_res_line, u_color_line, a_pos_point, a_size_point, a_alpha_point, a_pos_line, a_alpha_line, lineR, lineG, lineB, pointR, pointG, pointB, DPR } = inst;
    const t = now / 1000;
    for (let i = 0; i < count; i++) {
      const p = particles[i];
      p.vx += Math.sin(t * 0.3 + p.phase) * 0.008;
      p.vy += Math.cos(t * 0.27 + p.phase * 1.3) * 0.008;
      if (mouse.active) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < 9000 && d2 > 100) {
          const f = 60 / d2;
          p.vx += dx * f * 0.04; p.vy += dy * f * 0.04;
        }
      }
      p.vx *= 0.96; p.vy *= 0.96;
      p.x += p.vx; p.y += p.vy;
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;
      let alpha = p.baseAlpha;
      if (mouse.active) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < 40000) alpha = Math.min(1.0, alpha + (1 - d2/40000) * 0.6);
      }
      pointVerts[i*4 + 0] = p.x;
      pointVerts[i*4 + 1] = p.y;
      pointVerts[i*4 + 2] = p.size;
      pointVerts[i*4 + 3] = alpha;
    }
    let lineCount = 0;
    for (let i = 0; i < count; i++) {
      const a = particles[i];
      for (let j = i + 1; j < count; j++) {
        const b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < LINK_DIST_SQ) {
          const t2 = 1 - d2 / LINK_DIST_SQ;
          const alpha = t2 * 0.5;
          const base = lineCount * 6;
          lineVerts[base + 0] = a.x; lineVerts[base + 1] = a.y; lineVerts[base + 2] = alpha;
          lineVerts[base + 3] = b.x; lineVerts[base + 4] = b.y; lineVerts[base + 5] = alpha;
          lineIndices[lineCount * 2 + 0] = lineCount * 2 + 0;
          lineIndices[lineCount * 2 + 1] = lineCount * 2 + 1;
          lineCount++;
          if (lineCount >= LINE_BUDGET) break;
        }
      }
      if (lineCount >= LINE_BUDGET) break;
    }

    gl.clear(gl.COLOR_BUFFER_BIT);

    if (lineCount > 0) {
      gl.useProgram(lineProgram);
      gl.uniform2f(u_res_line, w, h);
      gl.uniform3f(u_color_line, lineR, lineG, lineB);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
      gl.bufferData(gl.ARRAY_BUFFER, lineVerts.subarray(0, lineCount * 6), gl.DYNAMIC_DRAW);
      const lineIdxBuf = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineIdxBuf);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, lineIndices.subarray(0, lineCount * 2), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(a_pos_line);
      gl.vertexAttribPointer(a_pos_line, 2, gl.FLOAT, false, 12, 0);
      gl.enableVertexAttribArray(a_alpha_line);
      gl.vertexAttribPointer(a_alpha_line, 1, gl.FLOAT, false, 12, 8);
      gl.drawElements(gl.LINES, lineCount * 2, gl.UNSIGNED_SHORT, 0);
      gl.deleteBuffer(lineIdxBuf);
    }

    gl.useProgram(pointProgram);
    gl.uniform2f(u_res_point, w, h);
    gl.uniform3f(u_color_point, pointR, pointG, pointB);
    gl.uniform1f(u_dpr_point, DPR);
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pointVerts, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(a_pos_point);
    gl.vertexAttribPointer(a_pos_point, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(a_size_point);
    gl.vertexAttribPointer(a_size_point, 1, gl.FLOAT, false, 16, 8);
    gl.enableVertexAttribArray(a_alpha_point);
    gl.vertexAttribPointer(a_alpha_point, 1, gl.FLOAT, false, 16, 12);
    gl.drawArrays(gl.POINTS, 0, count);
  }

  // Init all canvas instances
  const instances = [];
  document.querySelectorAll('.hero-strands-canvas, .ambient-strands-canvas').forEach(canvas => {
    const inst = initCanvas(canvas);
    if (inst) instances.push(inst);
  });
  if (!instances.length) return;

  // Shared RAF loop (only one for all instances)
  function frame(now) {
    instances.forEach(inst => renderInstance(inst, now));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
