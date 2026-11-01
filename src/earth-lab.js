// Orthographic globe: one projection for texture, cities, coordinates and n·s lighting.
const models = new Map();
export const cities = [
  { id: "guangzhou", name: "广州", country: "中国", lat: 23.13, lon: 113.28 },
  { id: "beijing", name: "北京", country: "中国", lat: 39.91, lon: 116.4 },
  { id: "shanghai", name: "上海", country: "中国", lat: 31.22, lon: 121.46 },
  {
    id: "wellington",
    name: "惠灵顿",
    country: "新西兰",
    lat: -41.29,
    lon: 174.78,
  },
];
const rad = (n) => (n * Math.PI) / 180;
export const illumination = (n, s) =>
  n.reduce((sum, v, i) => sum + v * s[i], 0);
export function hemispheres(lat, lon) {
  const ns = lat === 0 ? "赤道上" : lat > 0 ? "北半球" : "南半球";
  // Textbook boundaries, not 0° / 180°. Wellington is east longitude but Western Hemisphere.
  const ew =
    lon === -20 || lon === 160
      ? "东西半球分界线上"
      : lon > -20 && lon < 160
        ? "东半球"
        : "西半球";
  return `${ns} · ${ew}`;
}
const coord = (n, axis) =>
  `${Math.abs(n).toFixed(1)}°${n === 0 ? "" : axis === "lat" ? (n > 0 ? "N 北纬" : "S 南纬") : n > 0 ? "E 东经" : "W 西经"}`;
export function earthLabHTML() {
  return `<section class="earth-lab" aria-label="太阳、经纬线和城市互动地球"><h3>把熟悉的地方，放回地球上</h3><p>点城市定位；选择“拖经线”或“拖纬线”后，在地球上拖动读坐标。拖动金色太阳，实时看昼夜分界。</p><div class="actions"><button data-earth-mode="coordinates">经纬线与城市</button><button data-earth-mode="light">太阳与昼夜</button></div><div class="actions earth-cities">${cities.map((c) => `<button data-city="${c.id}">${c.name}</button>`).join("")}</div><canvas class="earth-canvas" width="640" height="430" tabindex="0" aria-label="可拖动的太阳、地球与经纬线；选择拖动方式后使用鼠标或触控，也可用下方滑块"></canvas><div class="earth-place" role="status"></div><div class="earth-live" role="status" aria-live="polite"></div><div class="actions"><button data-earth-drag="earth">转动地球</button><button data-earth-drag="longitude">拖经线</button><button data-earth-drag="latitude">拖纬线</button></div><label>经线 <input data-earth-lon type="range" min="-180" max="180" step="1"><output data-earth-lon-label></output></label><label>纬线 <input data-earth-lat type="range" min="-90" max="90" step="1"><output data-earth-lat-label></output></label><p class="earth-coordinate-readout"></p><div class="actions"><button data-earth="play">▶ 自动自转</button><button data-earth="step">自转四分之一周</button><button data-earth="sun">把太阳移到另一侧</button><button data-earth="reset">重置实验</button></div><label><input data-earth-hemispheres type="checkbox"> 显示20°W / 160°E半球分界</label><p class="caption">赤道分南北；20°W与160°E分东西半球。东经不一定在东半球：惠灵顿约174.8°E，在南半球、西半球。城市为近似代表点，不是城市范围。</p><p class="caption">光照与坐标模型，大小、距离不按比例。拖太阳改变模型光照方向，不代表太阳每天绕地球转；同一地点昼夜交替来自地球自转。本模型不用于解释四季。</p><details><summary>地图与城市坐标来源</summary><p>NASA Blue Marble / Reto Stöckli、Robert Simmon等，Wikimedia Commons，CC BY-SA 3.0；广州采用UNGEGN代表点，北京、上海、惠灵顿采用GeoNames代表点，坐标取近似。全部资源本地保存，无定位请求。</p></details></section>`;
}
export function selectEarthRegion(key, region) {
  const m = models.get(key);
  if (!m) return;
  if (["equator", "latitude", "longitude"].includes(region)) {
    m.mode = "coordinates";
    m.dragMode = region === "longitude" ? "longitude" : "latitude";
    if (region === "equator") {
      m.lat = 0;
      m.city = null;
    }
  }
  if (["day", "night", "spin"].includes(region)) m.mode = "light";
  if (["day", "night"].includes(region)) {
    const a = rad(m.lon - m.center) + m.spin,
      p = rad(m.lat);
    m.angle =
      Math.atan2(-Math.sin(p), Math.sin(a) * Math.cos(p)) +
      (region === "night" ? Math.PI : 0);
  }
}
export function mountEarthLab(root, key, observed = () => {}) {
  const canvas = root.querySelector(".earth-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d"),
    cx = 320,
    cy = 207,
    radius = 118,
    orbit = 182,
    size = 236;
  const defaults = () => ({
    angle: Math.PI,
    spin: 0,
    center: 110,
    lat: 23.13,
    lon: 113.28,
    city: "guangzhou",
    mode: /-d2-|-d7-q3/.test(key) ? "light" : "coordinates",
    dragMode: "earth",
    boundaries: false,
  });
  const m = models.get(key) || defaults();
  models.set(key, m);
  const status = root.querySelector(".earth-live"),
    place = root.querySelector(".earth-place"),
    play = root.querySelector('[data-earth="play"]');
  const sphere = document.createElement("canvas");
  sphere.width = sphere.height = size;
  const sc = sphere.getContext("2d"),
    pixels = sc.createImageData(size, size);
  let texture = null,
    tw = 0,
    th = 0,
    running = false,
    request = null,
    drag = null,
    last = 0;
  const image = new Image();
  image.onload = () => {
    const t = document.createElement("canvas");
    t.width = tw = 1024;
    t.height = th = 512;
    const tc = t.getContext("2d", { willReadFrequently: true });
    tc.drawImage(image, 0, 0, tw, th);
    texture = tc.getImageData(0, 0, tw, th).data;
    if (canvas.isConnected) draw();
  };
  image.src = "./public/assets/earth-map.jpg";
  function project(lat, lon) {
    const a = rad(lon - m.center) + m.spin,
      p = rad(lat);
    const normal = [
      Math.sin(a) * Math.cos(p),
      -Math.sin(p),
      Math.cos(a) * Math.cos(p),
    ];
    return {
      normal,
      x: cx + normal[0] * radius,
      y: cy + normal[1] * radius,
      visible: normal[2] >= 0,
    };
  }
  const parallel = (lat) =>
    Array.from({ length: 181 }, (_, i) => [lat, -180 + i * 2]);
  const meridian = (lon) =>
    Array.from({ length: 91 }, (_, i) => [-90 + i * 2, lon]);
  function line(points, color, width = 1, dashed = false) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dashed ? [4, 4] : []);
    ctx.beginPath();
    let pen = false;
    for (const [lat, lon] of points) {
      const p = project(lat, lon);
      if (!p.visible) {
        pen = false;
        continue;
      }
      if (pen) ctx.lineTo(p.x, p.y);
      else {
        ctx.moveTo(p.x, p.y);
        pen = true;
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function draw() {
    const light = [
      Math.cos(m.angle) * Math.sqrt(0.9375),
      Math.sin(m.angle) * Math.sqrt(0.9375),
      0.25,
    ];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const nx = (x + 0.5 - size / 2) / (size / 2),
          ny = (y + 0.5 - size / 2) / (size / 2),
          d = nx * nx + ny * ny,
          i = (y * size + x) * 4;
        if (d > 1) {
          pixels.data[i + 3] = 0;
          continue;
        }
        const nz = Math.sqrt(1 - d),
          dot = illumination([nx, ny, nz], light),
          longitude = Math.atan2(nx, nz) - m.spin + rad(m.center),
          latitude = Math.asin(-ny);
        const u = (((longitude / (2 * Math.PI) + 0.5) % 1) + 1) % 1,
          v = 0.5 - latitude / Math.PI,
          ti =
            (Math.min(th - 1, Math.floor(v * th)) * tw + Math.floor(u * tw)) *
            4;
        const color = texture
            ? [texture[ti], texture[ti + 1], texture[ti + 2]]
            : [40, 123, 168],
          shade =
            m.mode === "coordinates"
              ? 0.8 + 0.2 * nz
              : dot > 0
                ? 0.55 + 0.45 * dot
                : 0.12;
        for (let c = 0; c < 3; c++)
          pixels.data[i + c] =
            m.mode === "light" && Math.abs(dot) < 0.012
              ? [249, 217, 126][c]
              : Math.round(color[c] * shade);
        pixels.data[i + 3] = 255;
      }
    sc.putImageData(pixels, 0, 0);
    ctx.fillStyle = "#122337";
    ctx.fillRect(0, 0, 640, 430);
    for (let i = 0; i < 32; i++) {
      ctx.fillStyle = "#bbcddd66";
      ctx.fillRect((i * 97 + 37) % 640, (i * 59 + 17) % 430, 2, 2);
    }
    const sx = cx + orbit * Math.cos(m.angle),
      sy = cy + orbit * Math.sin(m.angle);
    if (m.mode === "light") {
      ctx.strokeStyle = "#efd07977";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 7]);
      for (const offset of [-28, 0, 28]) {
        ctx.beginPath();
        ctx.moveTo(sx, sy + offset);
        ctx.lineTo(cx, cy + offset);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    ctx.drawImage(sphere, cx - radius, cy - radius);
    for (const lat of [-60, -30, 0, 30, 60])
      line(
        parallel(lat),
        lat === 0 ? "#ef9981" : "#cae9ef77",
        lat === 0 ? 2 : 1,
      );
    for (let lon = -180; lon < 180; lon += 30)
      line(meridian(lon), lon === 0 ? "#ef9981" : "#cae9ef77");
    if (m.boundaries) {
      line(meridian(-20), "#f29cdb", 3, true);
      line(meridian(160), "#f29cdb", 3, true);
    }
    line(parallel(m.lat), "#f5d871", 2);
    line(meridian(m.lon), "#f5d871", 2);
    ctx.strokeStyle = "#72b6dc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#f1c658";
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#f0cb69";
    ctx.beginPath();
    ctx.arc(sx, sy, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = "bold 18px system-ui";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffedb5";
    ctx.fillText("拖动太阳", sx, sy + (sy < 70 ? 48 : -37));
    for (const c of cities) {
      const p = project(c.lat, c.lon);
      if (!p.visible) continue;
      ctx.fillStyle = c.id === m.city ? "#ffad64" : "#fff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, c.id === m.city ? 6 : 3, 0, Math.PI * 2);
      ctx.fill();
      if (c.id === m.city) {
        ctx.font = "bold 16px system-ui";
        ctx.textAlign = "left";
        ctx.strokeStyle = "#122337";
        ctx.lineWidth = 4;
        ctx.strokeText(c.name, p.x + 10, p.y - 10);
        ctx.fillText(c.name, p.x + 10, p.y - 10);
      }
    }
    const p = project(m.lat, m.lon),
      dot = illumination(p.normal, light),
      phase =
        Math.abs(dot) < 0.06 ? "正在经过晨昏线" : dot > 0 ? "白昼" : "黑夜";
    if (!m.city && p.visible) {
      ctx.fillStyle = "#ffad64";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#d3e7ef";
    ctx.font = "16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(
      m.mode === "coordinates"
        ? "金线＝所选经纬线 · 红线＝赤道 / 本初子午线"
        : "橙点＝同一地点 · 金色明暗交界＝昼夜分界",
      320,
      405,
    );
    const city = cities.find((c) => c.id === m.city);
    place.textContent = `${city ? city.country + " · " + city.name : "经纬线交点"}：${coord(m.lat, "lat")}，${coord(m.lon, "lon")} · ${hemispheres(m.lat, m.lon)}`;
    const text =
      m.mode === "light"
        ? `观察点：${phase}${!p.visible ? "（已转到地球背面）" : ""}。面向太阳是白昼，背向太阳是黑夜。`
        : "转动地球不会改变城市经纬度；移动金色经纬线是在选择新的坐标。";
    if (status.textContent !== text) status.textContent = text;
    root.querySelector("[data-earth-lon-label]").textContent = coord(
      m.lon,
      "lon",
    );
    root.querySelector("[data-earth-lat-label]").textContent = coord(
      m.lat,
      "lat",
    );
    root.querySelector(".earth-coordinate-readout").textContent = hemispheres(
      m.lat,
      m.lon,
    );
    for (const [attr, value] of [
      ["earth-mode", m.mode],
      ["earth-drag", m.dragMode],
      ["city", m.city],
    ])
      root
        .querySelectorAll(`[data-${attr}]`)
        .forEach((b) =>
          b.setAttribute(
            "aria-pressed",
            String(b.getAttribute("data-" + attr) === value),
          ),
        );
    Object.assign(canvas.dataset, {
      sunAngle: String(m.angle),
      spin: String(m.spin),
      phase,
      mode: m.mode,
      lat: String(m.lat),
      lon: String(m.lon),
    });
  }
  function sync() {
    root.querySelector("[data-earth-lon]").value = String(Math.round(m.lon));
    root.querySelector("[data-earth-lat]").value = String(Math.round(m.lat));
  }
  function point(e) {
    const b = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - b.left) * 640) / b.width,
      y: ((e.clientY - b.top) * 430) / b.height,
    };
  }
  function move(p) {
    if (drag.kind === "sun") {
      m.angle = Math.atan2(p.y - cy, p.x - cx);
      m.mode = "light";
    } else if (drag.kind === "latitude") {
      m.lat =
        (Math.asin(Math.max(-1, Math.min(1, (cy - p.y) / radius))) * 180) /
        Math.PI;
      m.city = null;
    } else if (drag.kind === "longitude") {
      const nx = (p.x - cx) / radius,
        ny = (p.y - cy) / radius,
        nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      m.lon =
        ((((Math.atan2(nx, nz) - m.spin + rad(m.center)) * 180) / Math.PI +
          540) %
          360) -
        180;
      m.city = null;
    } else {
      m.spin += (p.x - drag.x) / radius;
      drag.x = p.x;
    }
    sync();
    draw();
  }
  canvas.onpointerdown = (e) => {
    const p = point(e),
      sx = cx + orbit * Math.cos(m.angle),
      sy = cy + orbit * Math.sin(m.angle);
    if (Math.hypot(p.x - sx, p.y - sy) < 44) drag = { kind: "sun", x: p.x };
    else if (Math.hypot(p.x - cx, p.y - cy) < radius + 12)
      drag = { kind: m.dragMode, x: p.x };
    else return;
    running = false;
    play.textContent = "▶ 自动自转";
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
    move(p);
  };
  canvas.onpointermove = (e) => {
    if (drag) move(point(e));
  };
  const end = (e) => {
    const finished = drag;
    drag = null;
    if (e && canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
    if (finished) {
      observed(
        {
          sun: "day",
          earth: "spin",
          longitude: "longitude",
          latitude: "latitude",
        }[finished.kind],
      );
    }
  };
  canvas.onpointerup = end;
  canvas.onpointercancel = end;
  canvas.onlostpointercapture = end;
  canvas.onkeydown = (e) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key))
      return;
    e.preventDefault();
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      m.spin += ((e.key === "ArrowRight" ? 1 : -1) * Math.PI) / 12;
      observed("spin");
    } else {
      m.angle += ((e.key === "ArrowDown" ? 1 : -1) * Math.PI) / 12;
      m.mode = "light";
      observed("day");
    }
    draw();
  };
  function animate(time) {
    if (!canvas.isConnected) {
      running = false;
      return;
    }
    if (running) {
      m.spin += Math.min(50, time - (last || time)) * 0.0004;
      draw();
    }
    last = time;
    request = requestAnimationFrame(animate);
  }
  root.querySelectorAll("[data-earth-mode]").forEach(
    (b) =>
      (b.onclick = () => {
        m.mode = b.dataset.earthMode;
        draw();
      }),
  );
  root.querySelectorAll("[data-earth-drag]").forEach(
    (b) =>
      (b.onclick = () => {
        m.dragMode = b.dataset.earthDrag;
        draw();
      }),
  );
  root.querySelectorAll("[data-city]").forEach(
    (b) =>
      (b.onclick = () => {
        const c = cities.find((c) => c.id === b.dataset.city);
        Object.assign(m, {
          city: c.id,
          lat: c.lat,
          lon: c.lon,
          center: c.lon,
          spin: 0,
        });
        sync();
        draw();
      }),
  );
  root.querySelectorAll("[data-earth]").forEach(
    (b) =>
      (b.onclick = () => {
        const name = b.dataset.earth;
        if (name === "play") {
          m.mode = "light";
          running = !running;
          play.textContent = running ? "Ⅱ 暂停自转" : "▶ 自动自转";
          if (running) observed("spin");
        }
        if (name === "step") {
          m.mode = "light";
          m.spin += Math.PI / 2;
          observed("spin");
        }
        if (name === "sun") {
          m.mode = "light";
          m.angle += Math.PI;
          observed("day");
        }
        if (name === "reset") {
          Object.assign(m, defaults());
          running = false;
          play.textContent = "▶ 自动自转";
          root.querySelector("[data-earth-hemispheres]").checked = false;
          sync();
        }
        draw();
      }),
  );
  for (const axis of ["lat", "lon"]) {
    const slider = root.querySelector(`[data-earth-${axis}]`);
    slider.oninput = () => {
      m[axis] = Number(slider.value);
      m.city = null;
      draw();
    };
    slider.onchange = () => observed(axis === "lat" ? "latitude" : "longitude");
  }
  const check = root.querySelector("[data-earth-hemispheres]");
  check.checked = m.boundaries;
  check.onchange = () => {
    m.boundaries = check.checked;
    draw();
  };
  // Handle touch release directly as well as native click. Some touch sequences
  // following a captured globe drag omit the compatibility click. Deduplicate
  // a subsequent native click, while retaining keyboard activation (detail=0).
  root.querySelectorAll(".earth-lab button").forEach((b) => {
    const activate = b.onclick;
    let touchedAt = -Infinity;
    b.onpointerup = (e) => {
      if (e.pointerType !== "touch" || !activate) return;
      e.preventDefault();
      touchedAt = performance.now();
      activate(e);
    };
    b.onclick = (e) => {
      if (e.detail > 0 && performance.now() - touchedAt < 600) return;
      activate?.(e);
    };
  });
  sync();
  draw();
  request = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(request);
}
