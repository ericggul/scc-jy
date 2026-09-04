import type {
  PageLink,
  PageRankNetwork,
  RankTerritory,
  RankTerritoryDiagram,
} from "../model";

const CELL_VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_local;
layout(location = 2) in float a_rank;

out vec2 v_local;
out float v_rank;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_local = a_local;
  v_rank = a_rank;
}
`;

const CELL_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_local;
in float v_rank;
out vec4 outputColor;

vec3 hueToRgb(float hue) {
  return clamp(
    abs(mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0,
    0.0,
    1.0
  );
}

vec3 hsl(float hue, float saturation, float lightness) {
  vec3 rgb = hueToRgb(hue);
  float chroma = (1.0 - abs(2.0 * lightness - 1.0)) * saturation;
  return (rgb - 0.5) * chroma + lightness;
}

void main() {
  float rank = clamp(v_rank, 0.0, 1.0);
  float hue = (246.0 + rank * 75.0) / 360.0;
  vec3 rim = hsl((246.0 + rank * 83.0) / 360.0, 0.24 + rank * 0.24, 0.10 + rank * 0.15);
  vec3 body = hsl(hue, 0.27 + rank * 0.26, 0.22 + rank * 0.23);
  vec3 bloom = hsl(hue, 0.31 + rank * 0.23, 0.49 + rank * 0.18);
  float localDistance = length(v_local);
  float bodyMask = 1.0 - smoothstep(0.18, 1.05, localDistance);
  float highlight = exp(-dot(v_local + vec2(0.28, 0.34), v_local + vec2(0.28, 0.34)) * 3.8);
  float lowerShade = smoothstep(0.15, 1.18, localDistance) * 0.18;
  vec3 material = mix(rim, body, bodyMask);
  material = mix(material, bloom, highlight * 0.78);
  material *= 1.0 - lowerShade;
  outputColor = vec4(material, 1.0);
}
`;

const LINE_VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec4 a_colour;

out vec4 v_colour;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_colour = a_colour;
}
`;

const LINE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec4 v_colour;
out vec4 outputColor;

void main() {
  outputColor = v_colour;
}
`;

export type LinkActivity = {
  colour: number;
  startedAt: number;
};

export type PageRankGpuRenderInput = {
  diagram: RankTerritoryDiagram;
  network: PageRankNetwork;
  ranks: readonly number[];
  activities: ReadonlyMap<string, LinkActivity>;
  now: number;
};

export type PageRankGpuRenderer = {
  resize: (width: number, height: number, pixelRatio: number) => void;
  render: (input: PageRankGpuRenderInput) => void;
  destroy: () => void;
};

type Point = {
  x: number;
  y: number;
};

type Curve = {
  start: Point;
  control: Point;
  end: Point;
};

type Colour = readonly [number, number, number, number];

const SIGNAL_COLOURS: readonly Colour[] = [
  [0.84, 0.75, 0.61, 1],
  [0.78, 0.62, 0.61, 1],
  [0.67, 0.73, 0.73, 1],
  [0.72, 0.64, 0.59, 1],
  [0.88, 0.82, 0.73, 1],
  [0.72, 0.64, 0.76, 1],
];

const CELL_VERTEX_STRIDE = 5;
const LINE_VERTEX_STRIDE = 6;
const EDGE_SEGMENTS = 22;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL could not create a shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader error.";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error("WebGL could not create a program.");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown program link error.";
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function toClip(point: Point, width: number, height: number): Point {
  return {
    x: (point.x / width) * 2 - 1,
    y: 1 - (point.y / height) * 2,
  };
}

function rankProgress(rank: number, averageRank: number) {
  return (clamp(Math.log(Math.max(rank, averageRank * 0.04) / averageRank), -1.35, 1.65) + 1.35) / 3;
}

function curveForLink(
  link: PageLink,
  territories: ReadonlyMap<number, RankTerritory>,
  reciprocalIds: ReadonlySet<string>,
) {
  const source = territories.get(link.source);
  const target = territories.get(link.target);
  if (!source || !target || source.area === 0 || target.area === 0) return null;
  const start = source.centroid;
  const end = target.centroid;
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance < 6) return null;
  const reciprocal = reciprocalIds.has(`${link.target}-${link.source}`);
  const direction = reciprocal
    ? link.source < link.target ? 1 : -1
    : (link.source * 31 + link.target * 17) % 2 === 0 ? 1 : -1;
  const bend = Math.min(18, distance * 0.07) * direction;
  return {
    start,
    end,
    control: {
      x: (start.x + end.x) / 2 - (deltaY / distance) * bend,
      y: (start.y + end.y) / 2 + (deltaX / distance) * bend,
    },
  };
}

function quadraticPoint(curve: Curve, t: number): Point {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * curve.start.x + 2 * inverse * t * curve.control.x + t * t * curve.end.x,
    y: inverse * inverse * curve.start.y + 2 * inverse * t * curve.control.y + t * t * curve.end.y,
  };
}

function quadraticTangent(curve: Curve, t: number): Point {
  return {
    x: 2 * (1 - t) * (curve.control.x - curve.start.x) + 2 * t * (curve.end.x - curve.control.x),
    y: 2 * (1 - t) * (curve.control.y - curve.start.y) + 2 * t * (curve.end.y - curve.control.y),
  };
}

function pushVertex(
  vertices: number[],
  point: Point,
  colour: Colour,
  width: number,
  height: number,
) {
  const clip = toClip(point, width, height);
  vertices.push(clip.x, clip.y, colour[0], colour[1], colour[2], colour[3]);
}

function appendRibbon(
  vertices: number[],
  first: Point,
  second: Point,
  lineWidth: number,
  firstColour: Colour,
  secondColour: Colour,
  width: number,
  height: number,
) {
  const deltaX = second.x - first.x;
  const deltaY = second.y - first.y;
  const length = Math.hypot(deltaX, deltaY);
  if (length < 0.001) return;
  const halfWidth = lineWidth / 2;
  const normal = { x: (-deltaY / length) * halfWidth, y: (deltaX / length) * halfWidth };
  const firstLeft = { x: first.x + normal.x, y: first.y + normal.y };
  const firstRight = { x: first.x - normal.x, y: first.y - normal.y };
  const secondLeft = { x: second.x + normal.x, y: second.y + normal.y };
  const secondRight = { x: second.x - normal.x, y: second.y - normal.y };

  pushVertex(vertices, firstLeft, firstColour, width, height);
  pushVertex(vertices, firstRight, firstColour, width, height);
  pushVertex(vertices, secondLeft, secondColour, width, height);
  pushVertex(vertices, secondLeft, secondColour, width, height);
  pushVertex(vertices, firstRight, firstColour, width, height);
  pushVertex(vertices, secondRight, secondColour, width, height);
}

function appendArrowhead(
  vertices: number[],
  tip: Point,
  tangent: Point,
  size: number,
  colour: Colour,
  width: number,
  height: number,
) {
  const length = Math.max(0.001, Math.hypot(tangent.x, tangent.y));
  const direction = { x: tangent.x / length, y: tangent.y / length };
  const normal = { x: -direction.y, y: direction.x };
  const base = { x: tip.x - direction.x * size, y: tip.y - direction.y * size };
  pushVertex(vertices, tip, colour, width, height);
  pushVertex(vertices, { x: base.x + normal.x * size * 0.46, y: base.y + normal.y * size * 0.46 }, colour, width, height);
  pushVertex(vertices, { x: base.x - normal.x * size * 0.46, y: base.y - normal.y * size * 0.46 }, colour, width, height);
}

function appendCellMesh(
  vertices: number[],
  territory: RankTerritory,
  rank: number,
  averageRank: number,
  width: number,
  height: number,
) {
  if (territory.polygon.length < 3 || territory.area === 0) return;
  const centerClip = toClip(territory.centroid, width, height);
  const radius = Math.max(1, Math.sqrt(territory.area) * 1.28);
  const progress = rankProgress(rank, averageRank);
  const appendCellVertex = (point: Point) => {
    const clip = toClip(point, width, height);
    vertices.push(
      clip.x,
      clip.y,
      (point.x - territory.centroid.x) / radius,
      (point.y - territory.centroid.y) / radius,
      progress,
    );
  };
  for (let index = 0; index < territory.polygon.length; index += 1) {
    const first = territory.polygon[index]!;
    const second = territory.polygon[(index + 1) % territory.polygon.length]!;
    vertices.push(centerClip.x, centerClip.y, 0, 0, progress);
    appendCellVertex(first);
    appendCellVertex(second);
  }
}

function buildCellVertices(input: PageRankGpuRenderInput) {
  const vertices: number[] = [];
  const averageRank = 1 / Math.max(input.network.nodes.length, 1);
  for (const territory of input.diagram.territories) {
    appendCellMesh(
      vertices,
      territory,
      input.ranks[territory.pageId] ?? averageRank,
      averageRank,
      input.diagram.width,
      input.diagram.height,
    );
  }
  return new Float32Array(vertices);
}

function buildStaticLineVertices(input: PageRankGpuRenderInput) {
  const vertices: number[] = [];
  const { width, height, territories } = input.diagram;
  const territoriesByPage = new Map(territories.map((territory) => [territory.pageId, territory]));
  const linkIds = new Set(input.network.links.map((link) => link.id));

  for (const territory of territories) {
    for (let index = 0; index < territory.polygon.length; index += 1) {
      const first = territory.polygon[index]!;
      const second = territory.polygon[(index + 1) % territory.polygon.length]!;
      appendRibbon(
        vertices,
        first,
        second,
        0.72,
        [0.06, 0.035, 0.11, 0.42],
        [0.06, 0.035, 0.11, 0.42],
        width,
        height,
      );
    }
  }

  for (const link of input.network.links) {
    const curve = curveForLink(link, territoriesByPage, linkIds);
    if (!curve) continue;
    let previous = curve.start;
    for (let step = 1; step <= EDGE_SEGMENTS; step += 1) {
      const next = quadraticPoint(curve, step / EDGE_SEGMENTS);
      appendRibbon(
        vertices,
        previous,
        next,
        0.7,
        [0.94, 0.89, 0.85, 0.115],
        [0.94, 0.89, 0.85, 0.155],
        width,
        height,
      );
      previous = next;
    }
    appendArrowhead(
      vertices,
      curve.end,
      quadraticTangent(curve, 1),
      4.4,
      [0.96, 0.91, 0.86, 0.46],
      width,
      height,
    );

  }

  return new Float32Array(vertices);
}

function buildTrafficLineVertices(input: PageRankGpuRenderInput) {
  const vertices: number[] = [];
  const { width, height, territories } = input.diagram;
  const territoriesByPage = new Map(territories.map((territory) => [territory.pageId, territory]));
  const linkIds = new Set(input.network.links.map((link) => link.id));

  for (const link of input.network.links) {
    const activity = input.activities.get(link.id);
    if (!activity) continue;
    const age = input.now - activity.startedAt;
    if (age < 0 || age > 760) continue;
    const curve = curveForLink(link, territoriesByPage, linkIds);
    if (!curve) continue;
    const head = clamp(age / 540, 0, 1);
    const signalColour = SIGNAL_COLOURS[activity.colour % SIGNAL_COLOURS.length] ?? SIGNAL_COLOURS[0]!;
    const visibleSegments = Math.max(1, Math.ceil(EDGE_SEGMENTS * head));
    let signalPrevious = curve.start;
    for (let step = 1; step <= visibleSegments; step += 1) {
      const progress = (step / visibleSegments) * head;
      const signalNext = quadraticPoint(curve, progress);
      const alpha = 0.18 + 0.72 * progress;
      appendRibbon(
        vertices,
        signalPrevious,
        signalNext,
        1.45,
        [0.93, 0.87, 0.81, alpha * 0.42],
        [signalColour[0], signalColour[1], signalColour[2], alpha],
        width,
        height,
      );
      signalPrevious = signalNext;
    }

    const signalTip = quadraticPoint(curve, head);
    appendArrowhead(
      vertices,
      signalTip,
      quadraticTangent(curve, head),
      6.3,
      [0.98, 0.93, 0.86, 0.95],
      width,
      height,
    );
    if (head > 0.92) {
      appendArrowhead(
        vertices,
        curve.end,
        quadraticTangent(curve, 1),
        5.1,
        [signalColour[0], signalColour[1], signalColour[2], 0.88],
        width,
        height,
      );
    }
  }

  return new Float32Array(vertices);
}

function bindCellBuffer(gl: WebGL2RenderingContext, buffer: WebGLBuffer) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, CELL_VERTEX_STRIDE * 4, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, CELL_VERTEX_STRIDE * 4, 2 * 4);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 1, gl.FLOAT, false, CELL_VERTEX_STRIDE * 4, 4 * 4);
}

function bindLineBuffer(gl: WebGL2RenderingContext, buffer: WebGLBuffer) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, LINE_VERTEX_STRIDE * 4, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, LINE_VERTEX_STRIDE * 4, 2 * 4);
}

export function createPageRankGpuRenderer(gl: WebGL2RenderingContext): PageRankGpuRenderer {
  const cellProgram = createProgram(gl, CELL_VERTEX_SHADER, CELL_FRAGMENT_SHADER);
  const lineProgram = createProgram(gl, LINE_VERTEX_SHADER, LINE_FRAGMENT_SHADER);
  const cellBuffer = gl.createBuffer();
  const staticLineBuffer = gl.createBuffer();
  const trafficLineBuffer = gl.createBuffer();
  if (!cellBuffer || !staticLineBuffer || !trafficLineBuffer) {
    gl.deleteProgram(cellProgram);
    gl.deleteProgram(lineProgram);
    throw new Error("WebGL could not allocate PageRank buffers.");
  }
  let lastDiagram: RankTerritoryDiagram | null = null;
  let lastRanks: readonly number[] | null = null;
  let lastNetwork: PageRankNetwork | null = null;
  let cellVertexCount = 0;
  let staticLineVertexCount = 0;

  return {
    resize(width, height, pixelRatio) {
      gl.canvas.width = Math.round(Math.max(1, width) * pixelRatio);
      gl.canvas.height = Math.round(Math.max(1, height) * pixelRatio);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    },
    render(input) {
      const mustUpdateCells = lastDiagram !== input.diagram || lastRanks !== input.ranks;
      const mustUpdateStaticLines = lastDiagram !== input.diagram || lastNetwork !== input.network;
      if (mustUpdateCells) {
        const cellVertices = buildCellVertices(input);
        gl.bindBuffer(gl.ARRAY_BUFFER, cellBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, cellVertices, gl.DYNAMIC_DRAW);
        cellVertexCount = cellVertices.length / CELL_VERTEX_STRIDE;
        lastRanks = input.ranks;
      }
      if (mustUpdateStaticLines) {
        const staticLineVertices = buildStaticLineVertices(input);
        gl.bindBuffer(gl.ARRAY_BUFFER, staticLineBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, staticLineVertices, gl.STATIC_DRAW);
        staticLineVertexCount = staticLineVertices.length / LINE_VERTEX_STRIDE;
        lastDiagram = input.diagram;
        lastNetwork = input.network;
      }
      const trafficLineVertices = buildTrafficLineVertices(input);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.clearColor(0.045, 0.032, 0.075, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.disable(gl.BLEND);
      gl.useProgram(cellProgram);
      bindCellBuffer(gl, cellBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, cellVertexCount);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(lineProgram);
      bindLineBuffer(gl, staticLineBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, staticLineVertexCount);
      bindLineBuffer(gl, trafficLineBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, trafficLineVertices, gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, trafficLineVertices.length / LINE_VERTEX_STRIDE);
      gl.disable(gl.BLEND);
    },
    destroy() {
      gl.deleteBuffer(cellBuffer);
      gl.deleteBuffer(staticLineBuffer);
      gl.deleteBuffer(trafficLineBuffer);
      gl.deleteProgram(cellProgram);
      gl.deleteProgram(lineProgram);
    },
  };
}
