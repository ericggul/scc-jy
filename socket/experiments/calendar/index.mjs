import { randomUUID } from "node:crypto";

const id = "calendar";
const maxProfiles = 25_000;
const maxGridColumns = 50;
const variants = new Set(["1"]);
const clients = new Map();
const selections = new Map();

const events = {
  join: "calendar:join",
  hello: "calendar:hello",
  presence: "calendar:presence",
  selectionIn: "calendar:selection:in",
  selectionOut: "calendar:selection:out",
};

function normalizeVariant(value) {
  return variants.has(value) ? value : "1";
}

function getRoom(variantId) {
  return `experiment:${id}:${variantId}`;
}

function defaultSelection(variantId) {
  return {
    id: randomUUID(),
    experimentId: id,
    variantId,
    profileIds: Array.from(
      { length: 900 },
      (_, index) => `npc-${String(index + 1).padStart(4, "0")}`,
    ),
    viewport: {
      row: 0,
      column: 0,
      rows: 300,
      columns: 3,
      totalRows: Math.ceil(maxProfiles / 3),
      totalColumns: 3,
    },
    revision: 0,
    sentAt: Date.now(),
  };
}

function getSelection(variantId) {
  if (!selections.has(variantId)) {
    selections.set(variantId, defaultSelection(variantId));
  }
  return selections.get(variantId);
}

function clampInteger(value, minimum, maximum) {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(Math.max(Math.round(value), minimum), maximum);
}

function integerOr(value, fallback, minimum, maximum) {
  return Number.isFinite(value)
    ? clampInteger(value, minimum, maximum)
    : fallback;
}

function isProfileId(value) {
  if (typeof value !== "string" || !/^npc-\d+$/.test(value)) return false;
  const number = Number(value.slice(4));
  return number >= 1 && number <= maxProfiles;
}

function normalizeSelection(socket, payload = {}) {
  const variantId = socket.data[id]?.variantId || "1";
  const previous = getSelection(variantId);
  const viewport = payload.viewport || {};
  const totalColumns = integerOr(
    viewport.totalColumns,
    3,
    1,
    maxGridColumns,
  );
  const totalRows = Math.ceil(maxProfiles / totalColumns);
  const rows = integerOr(viewport.rows, 30, 1, totalRows);
  const columns = integerOr(viewport.columns, 3, 1, totalColumns);
  const normalizedRow = clampInteger(viewport.row, 0, totalRows - rows);
  const normalizedColumn = clampInteger(
    viewport.column,
    0,
    totalColumns - columns,
  );
  let expectedCount = 0;
  for (let rowOffset = 0; rowOffset < rows; rowOffset += 1) {
    const rowStart =
      (normalizedRow + rowOffset) * totalColumns + normalizedColumn;
    if (rowStart >= maxProfiles) break;
    expectedCount += Math.min(
      columns,
      totalColumns - normalizedColumn,
      maxProfiles - rowStart,
    );
  }
  const profileIds = Array.isArray(payload.profileIds)
    ? [...new Set(payload.profileIds)]
        .filter(isProfileId)
        .slice(0, expectedCount)
    : [];

  if (expectedCount > maxProfiles || profileIds.length !== expectedCount) return null;

  return {
    id: randomUUID(),
    experimentId: id,
    variantId,
    from: socket.id,
    profileIds,
    viewport: {
      row: normalizedRow,
      column: normalizedColumn,
      rows,
      columns,
      totalRows,
      totalColumns,
    },
    revision: previous.revision + 1,
    sentAt: Date.now(),
  };
}

function getPresence(io, variantId) {
  const room = getRoom(variantId);
  const sockets = [...io.sockets.sockets.values()].filter((socket) =>
    socket.rooms.has(room),
  );
  return {
    experimentId: id,
    variantId,
    total: sockets.length,
    mobiles: sockets.filter((socket) => socket.data[id]?.role === "mobile").length,
    screens: sockets.filter((socket) => socket.data[id]?.role === "screen").length,
    clients: sockets.map((socket) => ({
      id: socket.id,
      role: socket.data[id]?.role || "unknown",
      connectedAt: clients.get(socket.id)?.connectedAt || Date.now(),
    })),
    serverTime: Date.now(),
  };
}

function broadcastPresence(io, variantId) {
  io.to(getRoom(variantId)).emit(events.presence, getPresence(io, variantId));
}

function register({ io, socket }) {
  socket.on(events.join, ({ role, experimentSlug } = {}) => {
    const variantId = normalizeVariant(experimentSlug);
    socket.data[id] = {
      variantId,
      role: role === "mobile" || role === "screen" ? role : "unknown",
    };
    clients.set(socket.id, { connectedAt: Date.now() });
    socket.join(getRoom(variantId));
    socket.emit(events.hello, {
      socketId: socket.id,
      selection: getSelection(variantId),
      presence: getPresence(io, variantId),
    });
    broadcastPresence(io, variantId);
  });

  socket.on(events.selectionIn, (payload = {}) => {
    const variantId = socket.data[id]?.variantId;
    if (!variantId || socket.data[id]?.role !== "mobile") return;
    if (!socket.rooms.has(getRoom(variantId))) return;

    const selection = normalizeSelection(socket, payload);
    if (!selection) return;
    selections.set(variantId, selection);
    io.to(getRoom(variantId)).emit(events.selectionOut, selection);
  });

  socket.on("disconnect", () => {
    const variantId = socket.data[id]?.variantId;
    clients.delete(socket.id);
    if (variantId) broadcastPresence(io, variantId);
  });
}

export const calendarExperiment = { id, events, register };
