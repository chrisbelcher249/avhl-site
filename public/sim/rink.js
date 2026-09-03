(() => {
  "use strict";

  const SVG = Object.freeze({
    viewWidth: 410,
    viewHeight: 720,
    x: 42,
    y: 8,
    width: 326,
    height: 704,
    radius: 72
  });

  const RINK = {
    width: 200,
    height: 85,
    goalLines: Object.freeze({ low: 11, high: 189 }),
    blueLines: Object.freeze({ low: 75, high: 125 }),
    faceoffSpots: Object.freeze({
      center: Object.freeze({ x: 100, y: 42.5 }),
      lowLeft: Object.freeze({ x: 31, y: 22 }),
      lowRight: Object.freeze({ x: 31, y: 63 }),
      highLeft: Object.freeze({ x: 169, y: 22 }),
      highRight: Object.freeze({ x: 169, y: 63 }),
      // slightly closer back toward the blue lines
      neutralLowLeft: Object.freeze({ x: 82, y: 22 }),
      neutralLowRight: Object.freeze({ x: 82, y: 63 }),
      neutralHighLeft: Object.freeze({ x: 118, y: 22 }),
      neutralHighRight: Object.freeze({ x: 118, y: 63 })
    }),
    svg: SVG
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function toSvg(location) {
    const safe = location ?? RINK.faceoffSpots.center;
    return {
      x: SVG.x + (safe.y / RINK.height) * SVG.width,
      y: SVG.y + SVG.height - (safe.x / RINK.width) * SVG.height
    };
  }

  function fromSvg(point) {
    return {
      x: ((SVG.y + SVG.height - point.y) / SVG.height) * RINK.width,
      y: ((point.x - SVG.x) / SVG.width) * RINK.height
    };
  }

  function markerPoint(location, padding = 7) {
    const raw = toSvg(location);
    const left = SVG.x + padding;
    const right = SVG.x + SVG.width - padding;
    const top = SVG.y + padding;
    const bottom = SVG.y + SVG.height - padding;
    const radius = Math.max(1, SVG.radius - padding);

    let x = clamp(raw.x, left, right);
    let y = clamp(raw.y, top, bottom);

    const cornerX = x < left + radius ? left + radius : x > right - radius ? right - radius : null;
    const cornerY = y < top + radius ? top + radius : y > bottom - radius ? bottom - radius : null;

    if (cornerX !== null && cornerY !== null) {
      const dx = x - cornerX;
      const dy = y - cornerY;
      const distance = Math.hypot(dx, dy);
      if (distance > radius && distance > 0) {
        x = cornerX + (dx / distance) * radius;
        y = cornerY + (dy / distance) * radius;
      }
    }

    return { x, y };
  }

  function svgElement(tag, attributes = {}) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    return node;
  }

  function drawArenaBase(group) {
    group.replaceChildren();

    // Minimal dark stage only. No benches, tunnels, or penalty/scorer boxes.
    group.append(svgElement("rect", {
      class: "rink-stage-bg",
      x: 0,
      y: 0,
      width: SVG.viewWidth,
      height: SVG.viewHeight,
      rx: 12
    }));

    // Home-primary stanchion/glass frame sits directly against the ice.
    group.append(svgElement("rect", {
      class: "rink-stanchion",
      x: SVG.x,
      y: SVG.y,
      width: SVG.width,
      height: SVG.height,
      rx: SVG.radius
    }));
  }

  function addLine(group, className, a, b, extra = {}) {
    const start = toSvg(a);
    const end = toSvg(b);
    const isBlue = className === "blue-line";
    group.append(svgElement("line", {
      class: className,
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      stroke: extra.stroke ?? (isBlue ? "#2166c9" : "#d53348"),
      "stroke-width": extra.strokeWidth ?? (isBlue ? 3 : 2.4),
      "vector-effect": "non-scaling-stroke"
    }));
  }

  function addFaceoffMarkings(group, point) {
    const red = "#d53348";
    const sw = 1.5;
    const r = 27;

    // Rotate the support marks 90 degrees versus V4.9 and keep them OUTSIDE the circle.
    // Two short horizontal ticks on the left and right, plus two short vertical ticks above/below.
    for (const dy of [-5.5, 5.5]) {
      group.append(svgElement("line", {
        class: "faceoff-mark",
        x1: point.x - r - 5,
        y1: point.y + dy,
        x2: point.x - r,
        y2: point.y + dy,
        stroke: red,
        "stroke-width": sw,
        "vector-effect": "non-scaling-stroke"
      }));
      group.append(svgElement("line", {
        class: "faceoff-mark",
        x1: point.x + r,
        y1: point.y + dy,
        x2: point.x + r + 5,
        y2: point.y + dy,
        stroke: red,
        "stroke-width": sw,
        "vector-effect": "non-scaling-stroke"
      }));
    }

    for (const dx of [-5.5, 5.5]) {
      group.append(svgElement("line", {
        class: "faceoff-mark",
        x1: point.x + dx,
        y1: point.y - r - 5,
        x2: point.x + dx,
        y2: point.y - r,
        stroke: red,
        "stroke-width": sw,
        "vector-effect": "non-scaling-stroke"
      }));
      group.append(svgElement("line", {
        class: "faceoff-mark",
        x1: point.x + dx,
        y1: point.y + r,
        x2: point.x + dx,
        y2: point.y + r + 5,
        stroke: red,
        "stroke-width": sw,
        "vector-effect": "non-scaling-stroke"
      }));
    }
  }

  function addSpot(group, location, withCircle = false, center = false) {
    const point = toSvg(location);
    if (withCircle) {
      const radius = center ? 37 : 27;
      group.append(svgElement("circle", {
        class: `faceoff-circle${center ? " center" : ""}`,
        cx: point.x,
        cy: point.y,
        r: radius,
        fill: "none",
        stroke: "#d53348",
        "stroke-width": center ? 2.05 : 1.7,
        "vector-effect": "non-scaling-stroke"
      }));
      if (!center) addFaceoffMarkings(group, point);
    }
    group.append(svgElement("circle", {
      class: "faceoff-dot",
      cx: point.x,
      cy: point.y,
      r: withCircle ? 3.7 : 3.05,
      fill: "#d53348"
    }));
  }

  function addGoalCrease(group, goalLineX, topEnd) {
    const center = toSvg({ x: goalLineX, y: 42.5 });
    const radius = 20;
    const sweep = topEnd ? 1 : 0;
    const path = `M ${center.x - radius} ${center.y} L ${center.x + radius} ${center.y} A ${radius} ${radius} 0 0 ${sweep} ${center.x - radius} ${center.y} Z`;
    group.append(svgElement("path", {
      class: "goal-crease-fill",
      d: path,
      fill: "#b8ddf6",
      "fill-opacity": .86,
      stroke: "#d53348",
      "stroke-width": 1.35,
      "vector-effect": "non-scaling-stroke"
    }));
  }

  function addTrapezoid(group, goalLineX, endX) {
    const innerLeft = toSvg({ x: goalLineX, y: 35.5 });
    const innerRight = toSvg({ x: goalLineX, y: 49.5 });
    const outerLeft = toSvg({ x: endX, y: 29 });
    const outerRight = toSvg({ x: endX, y: 56 });
    for (const [a, b] of [[outerLeft, innerLeft], [outerRight, innerRight]]) {
      group.append(svgElement("line", {
        class: "trapezoid-line",
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        stroke: "#d53348",
        "stroke-width": 1.2,
        "vector-effect": "non-scaling-stroke"
      }));
    }
  }

  function drawRinkBase(group) {
    group.replaceChildren();

    group.append(svgElement("rect", {
      class: "rink-surface",
      x: SVG.x,
      y: SVG.y,
      width: SVG.width,
      height: SVG.height,
      rx: SVG.radius,
      fill: "#eef7ff",
      stroke: "none"
    }));

    addLine(group, "red-line", { x: 100, y: 0 }, { x: 100, y: 85 });
    addLine(group, "blue-line", { x: RINK.blueLines.low, y: 0 }, { x: RINK.blueLines.low, y: 85 });
    addLine(group, "blue-line", { x: RINK.blueLines.high, y: 0 }, { x: RINK.blueLines.high, y: 85 });
    addLine(group, "goal-line", { x: RINK.goalLines.low, y: 0 }, { x: RINK.goalLines.low, y: 85 });
    addLine(group, "goal-line", { x: RINK.goalLines.high, y: 0 }, { x: RINK.goalLines.high, y: 85 });

    addTrapezoid(group, RINK.goalLines.high, 199.3);
    addTrapezoid(group, RINK.goalLines.low, 0.7);

    addSpot(group, RINK.faceoffSpots.center, true, true);
    addSpot(group, RINK.faceoffSpots.lowLeft, true);
    addSpot(group, RINK.faceoffSpots.lowRight, true);
    addSpot(group, RINK.faceoffSpots.highLeft, true);
    addSpot(group, RINK.faceoffSpots.highRight, true);
    addSpot(group, RINK.faceoffSpots.neutralLowLeft);
    addSpot(group, RINK.faceoffSpots.neutralLowRight);
    addSpot(group, RINK.faceoffSpots.neutralHighLeft);
    addSpot(group, RINK.faceoffSpots.neutralHighRight);

    addGoalCrease(group, RINK.goalLines.high, true);
    addGoalCrease(group, RINK.goalLines.low, false);

    const topGoal = toSvg({ x: RINK.goalLines.high, y: 42.5 });
    const bottomGoal = toSvg({ x: RINK.goalLines.low, y: 42.5 });
    const topLight = toSvg({ x: 197.2, y: 42.5 });
    const bottomLight = toSvg({ x: 2.8, y: 42.5 });

    group.append(svgElement("circle", {
      class: "goal-light",
      "data-goal-light-end": "high",
      cx: topLight.x,
      cy: topLight.y,
      r: 5.2
    }));
    group.append(svgElement("circle", {
      class: "goal-light",
      "data-goal-light-end": "low",
      cx: bottomLight.x,
      cy: bottomLight.y,
      r: 5.2
    }));

    group.append(svgElement("rect", {
      class: "goal-frame",
      x: topGoal.x - 25,
      y: topGoal.y - 18,
      width: 50,
      height: 18,
      rx: 3,
      fill: "none",
      stroke: "#c62f42",
      "stroke-width": 2.6,
      "vector-effect": "non-scaling-stroke"
    }));
    group.append(svgElement("rect", {
      class: "goal-frame",
      x: bottomGoal.x - 25,
      y: bottomGoal.y,
      width: 50,
      height: 18,
      rx: 3,
      fill: "none",
      stroke: "#c62f42",
      "stroke-width": 2.6,
      "vector-effect": "non-scaling-stroke"
    }));
  }

  function initializeSvg(svg) {
    if (!svg) return;
    let arena = svg.querySelector(".arena-base");
    let base = svg.querySelector(".rink-base");
    if (!arena) {
      arena = svgElement("g", { class: "arena-base" });
      svg.insertBefore(arena, svg.firstChild?.nextSibling ?? null);
    }
    if (!base) {
      base = svgElement("g", { class: "rink-base" });
      svg.insertBefore(base, arena.nextSibling);
    }
    const clipId = `${svg.id}-clip`;
    base.setAttribute("clip-path", `url(#${clipId})`);
    drawArenaBase(arena);
    drawRinkBase(base);
    svg.dataset.rinkReady = "true";
  }

  function ensureSvg(svg) {
    if (!svg) return;
    const arena = svg.querySelector(".arena-base");
    const base = svg.querySelector(".rink-base");
    if (!arena || !base || base.childElementCount < 10) initializeSvg(svg);
  }

  window.AVHL_RINK_GEOMETRY = Object.freeze({
    ...RINK,
    toSvg,
    fromSvg,
    markerPoint,
    drawArenaBase,
    drawRinkBase,
    initializeSvg,
    ensureSvg
  });

  window.addEventListener("load", () => {
    document.querySelectorAll("svg.vertical-rink").forEach(initializeSvg);
  });
})();
