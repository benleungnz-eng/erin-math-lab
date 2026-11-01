export function sketch(canvas, record, save) {
  const ctx = canvas.getContext("2d");
  let lines = structuredClone(record.draft),
    stroke = null,
    erase = false;
  const paint = () => {
    if (!canvas.isConnected) return;
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(box.width * ratio);
    canvas.height = Math.round(box.height * ratio);
    ctx.scale(ratio, ratio);
    for (const line of lines) {
      ctx.globalCompositeOperation = line.erase
        ? "destination-out"
        : "source-over";
      ctx.lineWidth = line.erase ? 18 : 2.7;
      ctx.strokeStyle = "#344b54";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      line.points.forEach((p, i) => {
        const x = p[0] * box.width,
          y = p[1] * box.height;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      if (line.points.length === 1)
        ctx.lineTo(
          line.points[0][0] * box.width + 0.1,
          line.points[0][1] * box.height + 0.1,
        );
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  };
  const point = (e) => {
    const b = canvas.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)),
      Math.max(0, Math.min(1, (e.clientY - b.top) / b.height)),
    ];
  };
  canvas.onpointerdown = (e) => {
    if (stroke || lines.length >= 300) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    stroke = { points: [point(e)], erase, pointerId: e.pointerId };
    lines.push(stroke);
    paint();
  };
  canvas.onpointermove = (e) => {
    if (
      stroke &&
      stroke.pointerId === e.pointerId &&
      stroke.points.length < 3000
    ) {
      stroke.points.push(point(e));
      paint();
    }
  };
  const commit = () =>
    save(lines.map(({ points, erase }) => ({ points, erase })));
  canvas.onpointerup = canvas.onpointercancel = (e) => {
    if (stroke?.pointerId === e.pointerId) {
      stroke = null;
      commit();
    }
  };
  const observer = new ResizeObserver(() => {
    if (canvas.isConnected) paint();
    else observer.disconnect();
  });
  observer.observe(canvas);
  paint();
  return {
    undo() {
      lines.pop();
      paint();
      commit();
    },
    clear() {
      lines = [];
      paint();
      commit();
    },
    erase(value) {
      erase = value;
    },
    collapse(value) {
      canvas.classList.toggle("collapsed", value);
      paint();
    },
  };
}
