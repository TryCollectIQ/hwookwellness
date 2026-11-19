/* ============================================================
   Home page bottle story.
   Four short chapters that play on their own over a 3D bottle.
   If the browser cannot draw 3D, the product photo stays and the
   chapter bars still change the words.
   Needs three.min.js (same folder). Nothing here talks to a server.
   ============================================================ */
(function () {
  var stage = document.getElementById("st-stage");
  if (!stage) return;
  var $ = function (id) { return document.getElementById(id); };
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var CH = [
    ["Fresh breath that <em>doesn't burn.</em>", "A month of mouthwash in a 30&nbsp;mL amber glass dropper. One dropperful, a splash of water, swish and spit. Cool and clean, with no alcohol sting."],
    ["What goes in.", "Plant-derived sweeteners, zinc, green tea, cranberry and cooling menthol. The full ingredient list is on the product page."],
    ["One dropperful per rinse.", "The marked 1&nbsp;mL dropper measures it for you. Add a splash of water, swish for 30 seconds, then spit."],
    ["A month in one small bottle.", "About 30 rinses in amber glass. Small enough for a shelf, a bag or a carry-on."]
  ];
  var NAMES = ["Xylitol and erythritol", "Zinc citrate", "Green tea leaf extract", "Cranberry fruit extract", "Menthol, eucalyptol and thymol"];
  var LEN = [7, 4, 8, 8];
  var BASE = 0.3, STEP = 0.14, N = 28, GAP = 0.042, POUR = 3.1;

  var st = { yaw: -0.12, yawT: -0.12, pitch: 0.1, pitchT: 0.1, drag: false, reveal: still ? 1 : 0, level: 1, levelT: 1, out: 0, outT: 0, cur: -1, t0: 0, queue: [], done: 5, ch: 0, chT: 0, zoom: 1, lift: 0 };
  var bars = Array.prototype.slice.call(document.querySelectorAll("#st-bars button"));
  var fullLiquid = function () {};
  var has3d = false;

  function setCh(i) {
    st.ch = i; st.chT = 0; st.queue = []; st.cur = -1;
    $("st-t").innerHTML = CH[i][0]; $("st-d").innerHTML = CH[i][1]; $("st-now").textContent = "";
    bars.forEach(function (b, j) { b.setAttribute("aria-current", j === i ? "step" : "false"); if (!has3d || still) b.style.setProperty("--f", j <= i ? "1" : "0"); });
    if (i === 1 && has3d && !still) { st.done = 0; st.queue = [0, 1, 2, 3, 4]; } else { st.done = 5; fullLiquid(); }
  }
  bars.forEach(function (b, i) { b.addEventListener("click", function () { setCh(i); }); });
  bars.forEach(function (b, j) { b.style.setProperty("--f", j === 0 ? "1" : "0"); });

  /* ---------- can this browser draw 3D at all? ---------- */
  var ok = false;
  try { var t = document.createElement("canvas"); ok = !!(window.WebGL2RenderingContext && t.getContext("webgl2")); } catch (e) { ok = false; }
  if (!ok) return;

  function load(done) {
    if (window.THREE) return done();
    var s = document.createElement("script"); s.src = "three.min.js"; s.async = true; s.onload = done; document.head.appendChild(s);
  }
  function whenIdle(fn) { if (document.readyState === "complete") setTimeout(fn, 60); else window.addEventListener("load", function () { setTimeout(fn, 60); }); }
  whenIdle(function () { load(function () { try { start(); } catch (e) { stage.classList.remove("is-3d"); if (window.console) console.warn("Bottle story fell back to the photo:", e); } }); });

  function start() {
    var THREE = window.THREE, cv = $("st-cv");
    var renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    var scene = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(30, 1, 0.1, 120);

    /* The backdrop is the page's own tile colour, so the picture has no visible edge. */
    var css = getComputedStyle(document.documentElement);
    var tile = (css.getPropertyValue("--tile") || "#EFE8DC").trim();
    var bgc = new THREE.Color(tile);
    var dark = (0.299 * bgc.r + 0.587 * bgc.g + 0.114 * bgc.b) < 0.4;
    scene.background = bgc;

    /* A small photo studio for the glass to reflect: soft walls, two tall softboxes, an overhead strip,
       and two dark cards at the sides so the edges of the glass read against a pale backdrop. */
    var ec = document.createElement("canvas"); ec.width = 2048; ec.height = 1024; var eg = ec.getContext("2d");
    var sky = eg.createLinearGradient(0, 0, 0, 1024);
    if (dark) { sky.addColorStop(0, "#1c2a22"); sky.addColorStop(0.5, "#0c1711"); sky.addColorStop(1, "#040705"); }
    else { sky.addColorStop(0, "#f3ede0"); sky.addColorStop(0.55, "#d9cfba"); sky.addColorStop(1, "#8f8672"); }
    eg.fillStyle = sky; eg.fillRect(0, 0, 2048, 1024);
    var box = function (x, y, w, h, c, blur) { eg.save(); eg.filter = "blur(" + blur + "px)"; eg.fillStyle = c; eg.fillRect(x, y, w, h); eg.restore(); };
    box(360, 250, 150, 430, "#fffaf0", 10); box(1500, 230, 110, 460, "#fff3df", 12); box(820, 40, 520, 70, "#ffffff", 16); box(1840, 380, 60, 280, "#e3c98c", 14);
    if (!dark) { box(640, 300, 70, 420, "#2a2418", 22); box(1290, 300, 70, 420, "#2a2418", 22); box(1000, 330, 46, 360, "#1A3A2A", 26); }
    var etex = new THREE.CanvasTexture(ec); etex.mapping = THREE.EquirectangularReflectionMapping; etex.colorSpace = THREE.SRGBColorSpace;
    var pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(etex).texture; pm.dispose();
    var key = new THREE.DirectionalLight(0xfff1d6, dark ? 1.6 : 1.3); key.position.set(-6, 12, 8); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -6; key.shadow.camera.right = 6; key.shadow.camera.top = 12; key.shadow.camera.bottom = -2; key.shadow.radius = 6; key.shadow.bias = -0.0008; scene.add(key);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xe6dccb, dark ? 0.25 : 0.7));
    var root = new THREE.Group(); scene.add(root);
    var lathe = function (pts, seg) { return new THREE.LatheGeometry(pts.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), seg || 96); };

    /* Bottle: a 30 mL Boston round in amber glass. */
    var outer = [[0, 0], [1.36, 0], [1.52, 0.05], [1.6, 0.2], [1.6, 4.1], [1.57, 4.4], [1.44, 4.78], [1.18, 5.1], [0.95, 5.27], [0.86, 5.42], [0.86, 5.55], [0.92, 5.58], [0.92, 5.68], [0.86, 5.72], [0.86, 5.86], [0.92, 5.9], [0.92, 6.02], [0.86, 6.06], [0.86, 6.15], [0.7, 6.15]];
    var glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, thickness: 1.1, ior: 1.5, roughness: 0.03, metalness: 0, attenuationColor: new THREE.Color(dark ? 0xc96a12 : 0xa84a06), attenuationDistance: dark ? 2.6 : 0.75, side: THREE.DoubleSide, specularIntensity: 1, envMapIntensity: 1.25, clearcoat: 1, clearcoatRoughness: 0.02 });
    var glass = new THREE.Mesh(lathe(outer), glassMat); glass.castShadow = true; glass.renderOrder = 5; root.add(glass);

    /* The concentrate, rebuilt as it rises. */
    var liqMat = new THREE.MeshPhysicalMaterial({ color: 0x9c6a1e, roughness: 0.08, clearcoat: 1, envMapIntensity: 0.6 });
    var liq = null, liqLevel = -1;
    var topY = function (f) { return 0.3 + 4.15 * f; };
    var buildLiquid = function (f) {
      if (liq) { root.remove(liq); liq.geometry.dispose(); }
      var y = topY(f), r = y > 4.1 ? Math.max(0.9, 1.45 - (y - 4.1) * 0.55) : 1.45;
      liq = new THREE.Mesh(lathe([[0, 0.28], [1.36, 0.32], [1.45, 0.44], [1.45, Math.min(y, 4.1)], [r, y + 0.04], [r - 0.12, y], [0, y - 0.02]], 64), liqMat);
      liq.renderOrder = 2; root.add(liq); liqLevel = f;
    };
    buildLiquid(1);

    /* Cream label, matched to the product photo. */
    var lc = document.createElement("canvas"); lc.width = 1024; lc.height = 640;
    var spaced = function (c, text, x, y, gap) { var w = 0, i; for (i = 0; i < text.length; i++) w += c.measureText(text[i]).width + (i < text.length - 1 ? gap : 0); var px = x - w / 2; c.textAlign = "left"; for (i = 0; i < text.length; i++) { c.fillText(text[i], px, y); px += c.measureText(text[i]).width + gap; } c.textAlign = "center"; };
    var drawLabel = function () {
      var c = lc.getContext("2d");
      c.fillStyle = "#F3ECDD"; c.fillRect(0, 0, 1024, 640);
      c.fillStyle = "#B9975B"; c.fillRect(0, 26, 1024, 7); c.fillRect(0, 607, 1024, 7);
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillStyle = "#1A3A2A"; c.font = "700 124px 'Playfair Display', Georgia, serif"; spaced(c, "HWOOK", 512, 168, 14);
      c.fillStyle = "#B9975B"; c.fillRect(452, 252, 120, 3);
      c.fillStyle = "#1A3A2A"; c.font = "700 30px Karla, 'Helvetica Neue', Arial, sans-serif"; spaced(c, "CONCENTRATED BOTANICAL", 512, 312, 5); spaced(c, "MOUTHWASH", 512, 356, 5);
      c.fillStyle = "#86683F"; c.font = "italic 500 40px 'Playfair Display', Georgia, serif"; c.fillText("Berry · Cool Herbal", 512, 430);
      c.fillStyle = "#3d4a43"; c.font = "500 27px Karla, 'Helvetica Neue', Arial, sans-serif"; c.fillText("≈30 rinses · up to 1 month", 512, 498);
      c.font = "700 25px Karla, 'Helvetica Neue', Arial, sans-serif"; spaced(c, "1 FL OZ (30 mL)", 512, 552, 3);
    };
    drawLabel();
    var ltex = new THREE.CanvasTexture(lc); ltex.anisotropy = 8; ltex.colorSpace = THREE.SRGBColorSpace;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { drawLabel(); ltex.needsUpdate = true; });
    var label = new THREE.Mesh(new THREE.CylinderGeometry(1.612, 1.612, 2.9, 96, 1, true, -Math.PI * 0.6, Math.PI * 1.2), new THREE.MeshPhysicalMaterial({ map: ltex, roughness: 0.7, metalness: 0, envMapIntensity: 1.0, side: THREE.DoubleSide }));
    label.castShadow = true; label.position.y = 2.25; label.renderOrder = 6; root.add(label);

    /* Dropper: brushed gold collar, forest-green bulb, glass pipette. */
    var dropper = new THREE.Group(); root.add(dropper);
    var goldMat = new THREE.MeshStandardMaterial({ color: 0xc8a763, roughness: 0.34, metalness: 1, envMapIntensity: 1.25 });
    var ribs = []; for (var i = 0; i <= 96; i++) { var a = (i / 96) * Math.PI * 2, r = 1.04 + (i % 2 ? 0.022 : 0); ribs.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
    var collar = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape(ribs), { depth: 0.86, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }), goldMat);
    collar.rotation.x = -Math.PI / 2; collar.position.y = 5.5;
    var bulbPts = new THREE.SplineCurve([[0.76, 6.36], [0.68, 6.5], [0.67, 6.64], [0.74, 6.95], [0.78, 7.45], [0.7, 7.95], [0.48, 8.28], [0.2, 8.42], [0, 8.44]].map(function (p) { return new THREE.Vector2(p[0], p[1]); })).getPoints(40);
    var bulb = new THREE.Mesh(new THREE.LatheGeometry(bulbPts, 72), new THREE.MeshStandardMaterial({ color: 0x1d4732, roughness: 0.62, envMapIntensity: 0.35 }));
    var pipette = new THREE.Mesh(lathe([[0.25, 5.6], [0.25, 1.7], [0.21, 1.35], [0.11, 1.0], [0.075, 0.8], [0.05, 0.8], [0.09, 1.0], [0.18, 1.35], [0.2, 1.7], [0.2, 5.6]], 28), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, thickness: 0.12, ior: 1.5, roughness: 0.03, envMapIntensity: 0.7, side: THREE.DoubleSide }));
    pipette.renderOrder = 3;
    dropper.add(collar, bulb, pipette); collar.castShadow = true; bulb.castShadow = true;

    /* The floor only shows the shadow, plus a warm glow where light passes through the glass. */
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: dark ? 0.45 : 0.2 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    var sh = document.createElement("canvas"); sh.width = sh.height = 128; var sg = sh.getContext("2d");
    var grd = sg.createRadialGradient(64, 64, 6, 64, 64, 62);
    if (dark) { grd.addColorStop(0, "rgba(120,50,0,.55)"); grd.addColorStop(0.5, "rgba(120,50,0,.18)"); grd.addColorStop(1, "rgba(0,0,0,0)"); }
    else { grd.addColorStop(0, "rgba(150,78,14,.5)"); grd.addColorStop(0.45, "rgba(170,96,24,.2)"); grd.addColorStop(1, "rgba(170,96,24,0)"); }
    sg.fillStyle = grd; sg.fillRect(0, 0, 128, 128);
    var shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false, blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.004; scene.add(shadow);

    /* The ingredients, as small pieces that fall through the neck. Leaves and berries stand in for the extracts. */
    var leaf = new THREE.SphereGeometry(0.16, 10, 6); leaf.scale(1.25, 0.16, 0.6);
    var drop = new THREE.SphereGeometry(0.12, 12, 10); drop.scale(0.85, 1.35, 0.85);
    var KIND = [
      { geo: new THREE.BoxGeometry(0.17, 0.17, 0.17), mat: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, clearcoat: 1 }), tint: 0xd8cfae },
      { geo: new THREE.SphereGeometry(0.065, 8, 6), mat: new THREE.MeshStandardMaterial({ color: 0xdfe4e8, roughness: 0.5, metalness: 0.3 }), tint: 0xcfc7a4 },
      { geo: leaf, mat: new THREE.MeshStandardMaterial({ color: 0x4f8f3c, roughness: 0.55 }), tint: 0xb9ab62 },
      { geo: new THREE.SphereGeometry(0.15, 14, 10), mat: new THREE.MeshPhysicalMaterial({ color: 0x8f0f27, roughness: 0.18, clearcoat: 1 }), tint: 0xa8683a },
      { geo: drop, mat: new THREE.MeshPhysicalMaterial({ color: 0xf0c452, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.5 }), tint: 0xb8862f }
    ];
    var seed = 7, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    var bits = []; for (var k = 0; k < N; k++) { var m = new THREE.Mesh(KIND[0].geo, KIND[0].mat); m.visible = false; m.renderOrder = 4; root.add(m); bits.push({ m: m, a: 0, r: 0, y0: 0, s: 1, w: 0 }); }
    var tintFrom = new THREE.Color(), tintTo = new THREE.Color();
    fullLiquid = function () { st.level = st.levelT = 1; liqMat.color.set(0x9c6a1e); bits.forEach(function (b) { b.m.visible = false; }); };
    var startPour = function (i) {
      st.cur = i; st.done = Math.max(st.done, i + 1); st.t0 = performance.now() / 1000; $("st-now").textContent = NAMES[i];
      st.level = BASE + STEP * i; st.levelT = BASE + STEP * (i + 1); buildLiquid(st.level);
      tintFrom.set(i === 0 ? 0xd8c9a0 : KIND[i - 1].tint); tintTo.set(KIND[i].tint);
      bits.forEach(function (b) { b.m.geometry = KIND[i].geo; b.m.material = KIND[i].mat; b.a = rnd() * 6.283; b.r = Math.sqrt(rnd()) * 0.42; b.y0 = 10.4 + rnd() * 0.8; b.s = 0.75 + rnd() * 0.5; b.w = (rnd() - 0.5) * 9; b.m.visible = false; });
    };

    /* Drag sideways to turn the bottle. Up-and-down drags still scroll the page. */
    var px = 0, py = 0;
    cv.addEventListener("pointerdown", function (e) { st.drag = true; px = e.clientX; py = e.clientY; try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
    cv.addEventListener("pointermove", function (e) {
      if (!st.drag) return;
      var dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
      if (Math.abs(dx) > Math.abs(dy) || e.pointerType === "mouse") { st.yawT += dx * 0.011; if (e.pointerType === "mouse") st.pitchT = Math.max(-0.2, Math.min(1.05, st.pitchT + dy * 0.006)); }
    });
    var end = function () { st.drag = false; }; cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);

    var size = function () { var w = stage.clientWidth, h = stage.clientHeight, d = renderer.getPixelRatio(); if (!w || !h) return 0; if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); } return w / h; };
    var ease = function (x) { return x * x * (3 - 2 * x); }, clamp = function (x) { return Math.max(0, Math.min(1, x)); };
    var last = performance.now(), visible = true, raf = 0, shown = false, vw = 0;

    var frame = function (now) {
      raf = 0; var dt = Math.min(0.1, (now - last) / 1000), T = now / 1000; last = now;
      var aspect = size();
      if (!aspect) return;
      if (st.reveal < 1) st.reveal = Math.min(1, st.reveal + dt / 1.6);
      var rv = ease(st.reveal);
      /* Chapters advance on their own: the bottle, the pour, the dropper, the close. */
      if (!still && st.reveal >= 1) {
        st.chT += dt;
        var busyNow = st.cur >= 0 || st.queue.length > 0;
        var len = LEN[st.ch], prog = st.ch === 1 ? (busyNow ? Math.min(0.94, (st.done - 1 + (st.cur >= 0 ? (T - st.t0) / POUR : 0)) / 5) : Math.max(0, st.chT / len)) : st.chT / len;
        bars.forEach(function (b, j) { b.style.setProperty("--f", String(j < st.ch ? 1 : j === st.ch ? clamp(prog) : 0)); });
        if (!st.drag && ((st.ch !== 1 && st.chT > len) || (st.ch === 1 && !busyNow && st.chT > len))) setCh((st.ch + 1) % 4);
      }
      /* Pouring: lift the dropper out, run the current ingredient, then the next in the queue. */
      var busy = st.cur >= 0 || st.queue.length > 0;
      st.outT = busy ? 1 : st.ch === 2 ? 0.44 : 0; st.out += (st.outT - st.out) * Math.min(1, dt * 3.2);
      if (st.cur < 0 && st.queue.length && st.out > 0.93) startPour(st.queue.shift());
      if (st.cur >= 0) {
        var t = T - st.t0, kk = clamp((t - 0.9) / (POUR - 1.2));
        st.level = BASE + STEP * st.cur + STEP * ease(kk);
        liqMat.color.copy(tintFrom).lerp(tintTo, ease(kk));
        var surf = topY(st.level);
        bits.forEach(function (b, i) {
          var tt = t - i * GAP; if (tt < 0) { b.m.visible = false; return; }
          var y = b.y0 - 7 * tt * tt, s = b.s, sink = 0;
          if (y < surf) { sink = (surf - y) / 14; y = surf - Math.min(0.9, sink * 6); s *= 1 - clamp(sink * 5); }
          b.m.visible = s > 0.02; b.m.position.set(Math.cos(b.a) * b.r, y, Math.sin(b.a) * b.r); b.m.scale.setScalar(Math.max(0.001, s)); b.m.rotation.set(tt * b.w, tt * b.w * 0.7, b.a);
        });
        if (t > POUR) { bits.forEach(function (b) { b.m.visible = false; }); st.level = st.levelT; st.cur = -1; if (!st.queue.length) { $("st-now").textContent = ""; st.chT = Math.max(st.chT, 2.2); } }
      }
      /* Chapter 3: a single drop falls from the dropper, again and again. */
      if (st.ch === 2 && st.cur < 0) {
        var b0 = bits[0], tipY = 0.8 + 5.6 * ease(clamp(ease(clamp(st.out)) * 1.7)), td = (T % 1.7) - 0.5, sf = topY(st.level);
        b0.m.geometry = KIND[4].geo; b0.m.material = KIND[4].mat;
        var dy2 = td < 0 ? tipY - 0.12 : tipY - 0.12 - 9 * td * td;
        b0.m.visible = st.out > 0.38 && dy2 > sf; b0.m.position.set(0, dy2, 0); b0.m.scale.setScalar(td < 0 ? 0.5 + (td + 0.5) * 1.2 : 1.1); b0.m.rotation.set(0, 0, 0);
      }
      if (Math.abs(st.level - liqLevel) > 0.003) buildLiquid(st.level);
      var o = ease(clamp(st.out)), up = clamp(o * 1.7), side = clamp((o - 0.45) / 0.55);
      dropper.position.set(3.3 * ease(side), 5.6 * ease(up) - 1.2 * ease(side), 0); dropper.rotation.z = -0.5 * ease(side);
      if (!st.drag && !still) { if (st.ch === 0) st.yawT += dt * 0.35; else if (st.ch === 3) st.yawT += (Math.round(st.yawT / (2 * Math.PI)) * 2 * Math.PI - 0.12 - st.yawT) * Math.min(1, dt * 2); else st.yawT += dt * 0.1; }
      st.yaw += (st.yawT - st.yaw) * Math.min(1, dt * 8); st.pitch += (st.pitchT - st.pitch) * Math.min(1, dt * 6);
      root.rotation.y = st.yaw + (1 - rv) * 1.4; root.scale.setScalar(0.92 + 0.08 * rv);
      st.zoom += ((st.ch === 2 ? 1.04 : 1) - st.zoom) * Math.min(1, dt * 2); st.lift += ((st.ch === 2 ? 3.4 : 0) - st.lift) * Math.min(1, dt * 2);
      var wide = stage.classList.contains("wide") || aspect > 1.3;
      if (vw !== cv.width) { vw = cv.width; if (wide) cam.setViewOffset(cv.width, cv.height, -cv.width * 0.2, 0, cv.width, cv.height); else cam.clearViewOffset(); cam.updateProjectionMatrix(); }
      var free = st.ch === 2 ? 0 : 1;
      var cy = 4.25 + o * 1.1 * free + st.lift, dist = (wide ? 20 : 19) + o * 3.5 * free; dist = (dist) * st.zoom * (aspect < 0.85 ? 0.85 / aspect : 1);
      cam.position.set(0, cy + Math.sin(st.pitch) * dist, Math.cos(st.pitch) * dist); cam.lookAt(0, cy, 0);
      renderer.render(scene, cam);
      if (!shown) { shown = true; has3d = true; stage.classList.add("is-3d"); }
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    var kick = function () { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(stage);
    document.addEventListener("visibilitychange", kick);
    window.addEventListener("hashchange", function () { setTimeout(kick, 40); });
    window.addEventListener("resize", kick);
    kick();
  }
})();
