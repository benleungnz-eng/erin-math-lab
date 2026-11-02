import { cities, hemispheres } from "../../src/earth-lab.js";
import {
  TILT,
  YEAR,
  MONTH,
  radians,
  surfacePoint,
  earthPosition,
  daylight,
} from "../../src/solar-model.js";
const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
$("#question").textContent =
  params.get("prompt") || "转动视角，观察地球上的位置、光照和运动。";
const back = () => {
  if (parent !== window)
    parent.postMessage({ type: "erin:solar-close" }, location.origin);
  else location.href = "../../";
};
$("#back").onclick = $("#fallbackBack").onclick = back;
addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    back();
  }
});
$("#helpToggle").onclick = () => {
  $("#help").hidden = !$("#help").hidden;
  $("#helpToggle").setAttribute("aria-expanded", String(!$("#help").hidden));
};
const observed = new Set();
function observe(region) {
  if (observed.has(region) || parent === window) return;
  observed.add(region);
  parent.postMessage({ type: "erin:solar-observe", region }, location.origin);
}
try {
  const THREE = window.THREE;
  if (!THREE) throw Error("local 3D engine unavailable");
  const canvas = $("#space");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x091421);
  const camera = new THREE.PerspectiveCamera(44, 1, 0.03, 700);
  const ambient = new THREE.AmbientLight(0xb8d0da, 0.12);
  const sunlight = new THREE.PointLight(0xfff4df, 2.6, 0, 0);
  scene.add(ambient, sunlight);
  const geometry = new THREE.SphereGeometry(1, 64, 48);
  const sun = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0xffd086 }),
  );
  sun.scale.setScalar(1.5);
  scene.add(sun);
  const earthTilt = new THREE.Group();
  earthTilt.rotation.z = radians(-TILT);
  scene.add(earthTilt);
  const earthMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    shininess: 8,
    specular: 0x19313a,
  });
  const earth = new THREE.Mesh(geometry, earthMaterial);
  earth.scale.setScalar(0.8);
  earthTilt.add(earth);
  new THREE.TextureLoader().load(
    "./earth-land.png",
    (map) => {
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      earthMaterial.map = map;
      earthMaterial.needsUpdate = true;
      canvas.dataset.mapReady = "true";
      needsRender = true;
    },
    undefined,
    () => {
      $("#status").textContent = "地图暂未载入，可返回题目使用原图示。";
      canvas.dataset.mapReady = "failed";
    },
  );
  const moon = new THREE.Mesh(
    geometry,
    new THREE.MeshPhongMaterial({ color: 0xc8c9c4, shininess: 2 }),
  );
  moon.scale.setScalar(0.22);
  scene.add(moon);
  function line(points, color, opacity = 0.6) {
    return new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(
        points.map((p) => new THREE.Vector3(...p)),
      ),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
    );
  }
  const circle = (radius, lat = 0) =>
    Array.from({ length: 181 }, (_, i) => {
      const a = (i / 180) * Math.PI * 2,
        p = radians(lat);
      return [
        radius * Math.cos(p) * Math.cos(a),
        radius * Math.sin(p),
        -radius * Math.cos(p) * Math.sin(a),
      ];
    });
  const meridian = (lon, radius = 0.804) =>
    Array.from({ length: 181 }, (_, i) => {
      const p = radians(i - 90),
        a = radians(lon);
      return [
        radius * Math.cos(p) * Math.cos(a),
        radius * Math.sin(p),
        -radius * Math.cos(p) * Math.sin(a),
      ];
    });
  const globeGrid = new THREE.Group();
  earthTilt.add(globeGrid);
  for (let lat = -60; lat <= 60; lat += 30)
    globeGrid.add(
      line(
        circle(0.804, lat),
        lat === 0 ? 0xffd58f : 0xa3bbbd,
        lat === 0 ? 0.85 : 0.25,
      ),
    );
  for (let lon = -180; lon < 180; lon += 30)
    globeGrid.add(line(meridian(lon), lon === 0 ? 0xf8cf99 : 0xa3bbbd, 0.25));
  const equator = line(circle(0.808), 0xffd58f, 0.9);
  globeGrid.add(equator);
  let selectedLatLine = line(circle(0.812, 23.13), 0xf3dfa2, 0.95),
    selectedLonLine = line(meridian(113.28, 0.812), 0xf3dfa2, 0.95);
  globeGrid.add(selectedLatLine, selectedLonLine);
  const boundaries = new THREE.Group();
  globeGrid.add(boundaries);
  boundaries.add(
    line(meridian(-20, 0.816), 0xdfa4d6, 0.85),
    line(meridian(160, 0.816), 0xdfa4d6, 0.85),
  );
  boundaries.visible = false;
  const axis = line(
    [
      [0, -1.18, 0],
      [0, 1.18, 0],
    ],
    0xc1e0c8,
    0.8,
  );
  earthTilt.add(axis);
  const earthOrbit = line(
    Array.from({ length: 257 }, (_, i) => [
      8 * Math.cos((i / 256) * Math.PI * 2),
      0,
      8 * Math.sin((i / 256) * Math.PI * 2),
    ]),
    0x7b9caa,
    0.35,
  );
  scene.add(earthOrbit);
  const moonOrbit = line(
    Array.from({ length: 181 }, (_, i) => {
      const a = (i / 180) * Math.PI * 2;
      return [
        1.7 * Math.cos(a),
        1.7 * Math.sin(a) * Math.sin(radians(5.14)),
        1.7 * Math.sin(a) * Math.cos(radians(5.14)),
      ];
    }),
    0x8098a6,
    0.45,
  );
  scene.add(moonOrbit);
  const stars = [];
  let seed = 1428;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 950; i++) {
    const y = random() * 2 - 1,
      a = random() * Math.PI * 2,
      r = 85 + random() * 160,
      s = Math.sqrt(1 - y * y);
    stars.push(r * s * Math.cos(a), r * y, r * s * Math.sin(a));
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(stars, 3),
  );
  scene.add(
    new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: 0xa8bfc7,
        size: 0.12,
        sizeAttenuation: true,
      }),
    ),
  );
  let mode = ["coordinates", "spin", "orbit", "moon"].includes(
    params.get("focus"),
  )
    ? params.get("focus")
    : "spin";
  let playing = false,
    hours = 0,
    day = 0,
    moonDays = 0,
    selectedCity = "guangzhou",
    lat = 23.13,
    lon = 113.28;
  let az = 2.45,
    el = 0.32,
    distance = 4.4,
    view = "earth",
    last = performance.now(),
    frameId,
    width = 1,
    height = 1,
    sceneTop = 150;
  let userActed = false,
    needsRender = true,
    disposed = false;
  const target = new THREE.Vector3();
  const cityMarkers = cities.map((c) => {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.017, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe0a0 }),
    );
    scene.add(marker);
    const tag = document.createElement("span");
    tag.className = "tag city-tag";
    tag.textContent = c.name;
    tag.dataset.city = c.id;
    $("#cityLabels").append(tag);
    return { ...c, marker, tag };
  });
  function formatCoord(value, latitude) {
    return `${Math.abs(value).toFixed(1)}°${value === 0 ? "" : latitude ? (value > 0 ? "N" : "S") : value > 0 ? "E" : "W"}`;
  }
  function updateCoordinateLines() {
    globeGrid.remove(selectedLatLine, selectedLonLine);
    selectedLatLine.geometry.dispose();
    selectedLonLine.geometry.dispose();
    selectedLatLine.material.dispose();
    selectedLonLine.material.dispose();
    selectedLatLine = line(circle(0.812, lat), 0xf3dfa2, 0.95);
    selectedLonLine = line(meridian(lon, 0.812), 0xf3dfa2, 0.95);
    globeGrid.add(selectedLatLine, selectedLonLine);
    needsRender = true;
  }
  function updateUI() {
    document
      .querySelectorAll("[data-mode]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(mode === b.dataset.mode)),
      );
    document.querySelectorAll("[data-city]").forEach((b) => {
      if (b.tagName === "BUTTON")
        b.setAttribute("aria-pressed", String(selectedCity === b.dataset.city));
    });
    $("#play").textContent = playing ? "暂停运动" : "开始运动";
    $("#play").disabled = mode === "coordinates";
    $("#coordinateControls").hidden = mode !== "coordinates";
    $("#timeControl").hidden = mode === "coordinates";
    $("#time").max = mode === "spin" ? 24 : mode === "moon" ? MONTH : YEAR;
    $("#time").value =
      mode === "spin" ? hours : mode === "moon" ? moonDays : day;
    $("#timeTitle").textContent =
      mode === "spin"
        ? "地球自转时刻"
        : mode === "moon"
          ? "月球绕行进度"
          : "地球公转位置";
    $("#timeValue").textContent =
      mode === "spin"
        ? hours.toFixed(1) + " 小时"
        : (mode === "moon" ? moonDays : day).toFixed(0) + " 天";
    $("#longitude").value = lon;
    $("#latitude").value = lat;
    $("#longitudeValue").textContent = formatCoord(lon, false);
    $("#latitudeValue").textContent = formatCoord(lat, true);
    $("#clue").textContent = {
      coordinates: "选一座城市，再绕到侧面看：经线连接两极，纬线与赤道平行。",
      spin: "先盯住同一座城市，再开始自转：它怎样从亮面转入暗面？太阳保持不动。",
      orbit:
        "拖动轨道上的地球，或移动公转滑杆：地轴倾斜方向保持不变，南北半球受光怎样变化？",
      moon: "拓展观察：月球绕地球运行，亮面始终朝向太阳；这里未模拟日月食。",
    }[mode];
    const city = cities.find((c) => c.id === selectedCity);
    $("#place").textContent =
      `${city ? city.name : "所选交点"} · ${formatCoord(lat, true)}，${formatCoord(lon, false)} · ${hemispheres(lat, lon)}`;
    ambient.intensity = mode === "coordinates" ? 0.72 : 0.12;
    selectedLatLine.visible = selectedLonLine.visible = mode === "coordinates";
    boundaries.visible = mode === "coordinates" && $("#hemispheres").checked;
    needsRender = true;
  }
  function setMode(value) {
    mode = value;
    playing = false;
    userActed = false;
    view = value === "orbit" ? "system" : "earth";
    distance = view === "system" ? 25 : 4.4;
    az = 2.45;
    el = 0.32;
    updateUI();
  }
  document
    .querySelectorAll("[data-mode]")
    .forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
  function focusCity(c) {
    lat = c.lat;
    lon = c.lon;
    selectedCity = c.id;
    view = "earth";
    distance = 3.9;
    const spin =
      mode === "coordinates"
        ? 0
        : mode === "spin"
          ? (hours / 24) * Math.PI * 2
          : day * Math.PI * 2;
    const p = surfacePoint(lat, lon, spin);
    az = Math.atan2(p[0], p[2]);
    el = Math.asin(p[1] / Math.hypot(...p));
    updateCoordinateLines();
    updateUI();
  }
  document
    .querySelectorAll("button[data-city]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          focusCity(cities.find((c) => c.id === b.dataset.city))),
    );
  $("#play").onclick = () => {
    playing = !playing;
    userActed = true;
    if (playing && ["spin", "orbit"].includes(mode))
      if (["spin", "orbit"].includes(mode))
        observe(mode === "orbit" ? "orbit" : "spin");
    updateUI();
  };
  $("#time").oninput = () => {
    playing = false;
    userActed = true;
    const value = Number($("#time").value);
    if (mode === "spin") hours = value;
    else if (mode === "moon") moonDays = value;
    else day = value;
    observe(mode === "orbit" ? "orbit" : "spin");
    updateUI();
  };
  $("#earthView").onclick = () => {
    view = "earth";
    distance = 4.4;
    az = 2.45;
    el = 0.32;
    needsRender = true;
  };
  $("#systemView").onclick = () => {
    view = "system";
    distance = 25;
    az = 0.5;
    el = 0.55;
    needsRender = true;
  };
  $("#topView").onclick = () => {
    view = mode === "orbit" ? "system" : "earth";
    distance = view === "system" ? 25 : 4.4;
    el = 1.55;
    needsRender = true;
  };
  function zoom(factor) {
    distance = Math.max(
      view === "system" ? 10 : 2.1,
      Math.min(55, distance * factor),
    );
    needsRender = true;
  }
  $("#zoomIn").onclick = () => zoom(0.8);
  $("#zoomOut").onclick = () => zoom(1.25);
  for (const [id, region] of [
    ["latitude", "latitude"],
    ["longitude", "longitude"],
  ])
    $("#" + id).oninput = () => {
      if (id === "latitude") lat = Number($("#latitude").value);
      else lon = Number($("#longitude").value);
      selectedCity = null;
      updateCoordinateLines();
      observe(region);
      if (lat === 0) observe("equator");
      updateUI();
    };
  $("#hemispheres").onchange = () => updateUI();
  const pointers = new Map();
  let pinch = 0,
    draggingOrbit = false;
  const raycaster = new THREE.Raycaster(),
    plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const pointerVector = (e) => {
    const rect = canvas.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
  };
  function dragOrbit(e) {
    raycaster.setFromCamera(pointerVector(e), camera);
    const point = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, point)) {
      day =
        (((Math.atan2(point.z, point.x) - Math.PI / 2 + Math.PI * 2) %
          (Math.PI * 2)) /
          (Math.PI * 2)) *
        YEAR;
      playing = false;
      userActed = true;
      observe("orbit");
      updateUI();
    }
  }
  canvas.onpointerdown = (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    pinch = 0;
    raycaster.setFromCamera(pointerVector(e), camera);
    draggingOrbit =
      mode === "orbit" &&
      pointers.size === 1 &&
      raycaster.intersectObject(earth).length > 0;
    if (draggingOrbit) dragOrbit(e);
  };
  canvas.onpointermove = (e) => {
    const old = pointers.get(e.pointerId);
    if (!old) return;
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size > 1) {
      draggingOrbit = false;
      const [a, b] = [...pointers.values()];
      const span = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch) zoom(pinch / span);
      pinch = span;
    } else if (draggingOrbit) dragOrbit(e);
    else {
      az -= (e.clientX - old[0]) * 0.008;
      el = Math.max(-1.55, Math.min(1.55, el + (e.clientY - old[1]) * 0.008));
      needsRender = true;
    }
  };
  canvas.onpointerup =
    canvas.onpointercancel =
    canvas.onlostpointercapture =
      (e) => {
        pointers.delete(e.pointerId);
        pinch = 0;
        draggingOrbit = false;
      };
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoom(Math.exp(e.deltaY * 0.001));
    },
    { passive: false },
  );
  canvas.onkeydown = (e) => {
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "=",
        "-",
      ].includes(e.key)
    ) {
      e.preventDefault();
      if (e.key === "ArrowLeft") az += 0.12;
      if (e.key === "ArrowRight") az -= 0.12;
      if (e.key === "ArrowUp") el = Math.min(1.55, el + 0.12);
      if (e.key === "ArrowDown") el = Math.max(-1.55, el - 0.12);
      if (e.key === "+" || e.key === "=") zoom(0.85);
      if (e.key === "-") zoom(1.18);
      needsRender = true;
    }
  };
  function resize() {
    const controls = $(".controls").getBoundingClientRect(),
      side = innerWidth >= 1000 || (innerHeight < 600 && innerWidth >= 700);
    sceneTop = 145;
    width = Math.max(1, innerWidth - (side ? controls.width : 0));
    height = Math.max(
      120,
      innerHeight - sceneTop - (side ? 0 : controls.height),
    );
    canvas.style.position = "absolute";
    canvas.style.top = sceneTop + "px";
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    needsRender = true;
  }
  addEventListener("resize", resize);
  const observer = new ResizeObserver(resize);
  observer.observe($(".controls"));
  function label(id, point, offset = 0) {
    const p = point.clone();
    p.y += offset;
    p.project(camera);
    const node = typeof id === "string" ? $("#" + id) : id;
    node.hidden = p.z > 1 || p.z < -1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1;
    node.style.left = ((p.x + 1) * width) / 2 + 8 + "px";
    node.style.top = ((-p.y + 1) * height) / 2 + sceneTop + "px";
    return {
      x: ((p.x + 1) * width) / 2 + 8,
      y: ((-p.y + 1) * height) / 2 + sceneTop,
    };
  }
  function render() {
    const ep = earthPosition(mode === "orbit" ? day : 0);
    earthTilt.position.fromArray(ep);
    const spin =
      mode === "coordinates"
        ? 0
        : mode === "spin"
          ? (hours / 24) * Math.PI * 2
          : mode === "orbit"
            ? day * Math.PI * 2
            : 0;
    earth.rotation.y = globeGrid.rotation.y = spin;
    const moonAngle =
      ((mode === "moon" ? moonDays : mode === "orbit" ? day : 0) / MONTH) *
      Math.PI *
      2;
    moon.position
      .copy(earthTilt.position)
      .add(
        new THREE.Vector3(
          1.7 * Math.cos(moonAngle),
          1.7 * Math.sin(moonAngle) * Math.sin(radians(5.14)),
          1.7 * Math.sin(moonAngle) * Math.cos(radians(5.14)),
        ),
      );
    moonOrbit.position.copy(earthTilt.position);
    moon.visible = moonOrbit.visible = mode === "moon" || view === "system";
    earthOrbit.visible = view === "system" || mode === "orbit";
    target.copy(view === "earth" ? earthTilt.position : new THREE.Vector3());
    camera.position
      .copy(target)
      .add(
        new THREE.Vector3(
          distance * Math.cos(el) * Math.sin(az),
          distance * Math.sin(el),
          distance * Math.cos(el) * Math.cos(az),
        ),
      );
    camera.lookAt(target);
    camera.updateMatrixWorld();
    for (const c of cityMarkers) {
      c.marker.position
        .fromArray(surfacePoint(c.lat, c.lon, spin))
        .add(earthTilt.position);
      c.marker.scale.setScalar(c.id === selectedCity ? 1.35 : 1);
    }
    renderer.render(scene, camera);
    label("sunLabel", sun.position, 1.6);
    label("earthLabel", earthTilt.position, 0.95);
    label("moonLabel", moon.position, 0.26);
    $("#moonLabel").hidden ||= !moon.visible;
    label(
      "northLabel",
      new THREE.Vector3(...surfacePoint(90, 0, 0, TILT, 1.17)).add(
        earthTilt.position,
      ),
    );
    label(
      "southLabel",
      new THREE.Vector3(...surfacePoint(-90, 0, 0, TILT, 1.17)).add(
        earthTilt.position,
      ),
    );
    const placed = [];
    for (const c of [...cityMarkers].sort(
      (a, b) =>
        b.marker.position.clone().project(camera).y -
        a.marker.position.clone().project(camera).y,
    )) {
      const normal = c.marker.position
        .clone()
        .sub(earthTilt.position)
        .normalize();
      const toCamera = camera.position
        .clone()
        .sub(c.marker.position)
        .normalize();
      const front = normal.dot(toCamera) > 0.025;
      const p = label(c.tag, c.marker.position);
      c.tag.hidden ||= !front;
      c.marker.visible = front;
      if (!c.tag.hidden) {
        let y = p.y;
        for (const used of placed)
          if (Math.abs(p.x - used.x) < 85 && Math.abs(y - used.y) < 25)
            y = used.y + 25;
        c.tag.style.top = y + "px";
        placed.push({ x: p.x, y });
      }
      c.tag.classList.toggle("selected", c.id === selectedCity);
    }
    const local = surfacePoint(lat, lon, spin),
      lit = daylight(local, ep),
      phase = Math.abs(lit) < 0.035 ? "晨昏交界" : lit > 0 ? "白昼" : "黑夜";
    const status =
      mode === "coordinates"
        ? "经纬线观察已增强照明；纬度0°是赤道。"
        : mode === "spin"
          ? `${selectedCity ? cities.find((c) => c.id === selectedCity).name : "所选地点"}：${phase} · 自转一周约24小时，自西向东。`
          : mode === "orbit"
            ? `北半球：${Math.sin((day / YEAR) * Math.PI * 2) > 0.08 ? "较偏向太阳" : Math.sin((day / YEAR) * Math.PI * 2) < -0.08 ? "较背向太阳" : "接近春分或秋分位置"} · 地轴方向保持平行。`
            : "月球一侧被太阳照亮；从不同方向看，看到的亮面比例不同。";
    if ($("#status").textContent !== status) $("#status").textContent = status;
    if (mode === "spin" && userActed) {
      if (lit > 0.035) observe("day");
      if (lit < -0.035) observe("night");
    }
    canvas.dataset.mode = mode;
    canvas.dataset.spin = String(spin);
    canvas.dataset.day = String(day);
    canvas.dataset.phase = phase;
    canvas.dataset.renderer = "WebGL";
    canvas.dataset.lat = String(lat);
    canvas.dataset.lon = String(lon);
    $("#time").value =
      mode === "spin" ? hours : mode === "moon" ? moonDays : day;
    $("#timeValue").textContent =
      mode === "spin"
        ? hours.toFixed(1) + " 小时"
        : (mode === "moon" ? moonDays : day).toFixed(0) + " 天";
    needsRender = false;
  }
  function animate(now) {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (playing && document.visibilityState === "visible") {
      if (mode === "spin") hours = (hours + dt * 1.5) % 24;
      if (mode === "orbit") day = (day + dt * 12) % YEAR;
      if (mode === "moon") moonDays = (moonDays + dt * 1.2) % MONTH;
      needsRender = true;
    }
    if (needsRender && document.visibilityState === "visible") render();
    frameId = requestAnimationFrame(animate);
  }
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    playing = false;
    $("#status").textContent = "三维画面已暂停，可返回题目后重新打开。";
  });
  addEventListener(
    "pagehide",
    () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      scene.traverse((obj) => {
        obj.geometry?.dispose();
        if (obj.material) {
          obj.material.map?.dispose();
          obj.material.dispose();
        }
      });
      renderer.dispose();
    },
    { once: true },
  );
  document.addEventListener("visibilitychange", () => {
    last = performance.now();
    needsRender = true;
  });
  updateUI();
  resize();
  if (mode === "coordinates") focusCity(cities[0]);
  requestAnimationFrame(animate);
} catch (error) {
  $("#unavailable").hidden = false;
  $(".controls").hidden = true;
  $("#space").hidden = true;
  console.error("Solar demonstration unavailable:", error);
}
