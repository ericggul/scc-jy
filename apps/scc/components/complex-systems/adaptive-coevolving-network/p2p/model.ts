export type Device = {
  id: string;
  x: number;
  y: number;
  online: boolean;
  load: number;
  stability: number;
};

export type PeerLink = {
  id: string;
  source: string;
  target: string;
  quality: number;
  traffic: number;
};

export type PeerNetwork = {
  devices: Device[];
  links: PeerLink[];
  tick: number;
  nextDevice: number;
  nextLink: number;
};

const INITIAL_DEVICES = 14;

function clamp(value: number, low = 0, high = 1) {
  return Math.min(high, Math.max(low, value));
}

function unit(value: number) {
  return value - Math.floor(value);
}

function sample(seed: number) {
  return unit(Math.sin(seed * 67.289) * 39501.817);
}

function linkKey(source: string, target: string) {
  return [source, target].sort().join(":");
}

function distance(a: Device, b: Device) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function makeDevice(id: number, x?: number, y?: number): Device {
  return {
    id: `device-${id}`,
    x: x ?? 0.08 + sample(id * 5) * 0.84,
    y: y ?? 0.13 + sample(id * 17) * 0.74,
    online: true,
    load: 0.12 + sample(id * 29) * 0.64,
    stability: 0.48 + sample(id * 41) * 0.45,
  };
}

function makeLink(id: number, source: string, target: string, quality = 0.62): PeerLink {
  return { id: `link-${id}`, source, target, quality, traffic: 0 };
}

export function createPeerNetwork(): PeerNetwork {
  const devices = Array.from({ length: INITIAL_DEVICES }, (_, index) => makeDevice(index + 1));
  const keys = new Set<string>();
  const pairs: Array<[Device, Device]> = [];

  for (const device of devices) {
    for (const other of devices
      .filter((candidate) => candidate.id !== device.id)
      .sort((a, b) => distance(device, a) - distance(device, b))
      .slice(0, 2)) {
      const key = linkKey(device.id, other.id);
      if (keys.has(key)) continue;
      keys.add(key);
      pairs.push([device, other]);
    }
  }

  return {
    devices,
    links: pairs.map(([source, target], index) =>
      makeLink(index + 1, source.id, target.id, 0.35 + sample(index * 13) * 0.55),
    ),
    tick: 0,
    nextDevice: INITIAL_DEVICES + 1,
    nextLink: pairs.length + 1,
  };
}

export function addPeerDevice(network: PeerNetwork, x?: number, y?: number) {
  const device = makeDevice(network.nextDevice, x, y);
  const target = network.devices
    .filter((candidate) => candidate.online)
    .sort((a, b) => distance(device, a) - distance(device, b))[0];
  const links = target
    ? [...network.links, makeLink(network.nextLink, device.id, target.id, 0.68)]
    : network.links;

  return {
    ...network,
    devices: [...network.devices, device],
    links,
    nextDevice: network.nextDevice + 1,
    nextLink: target ? network.nextLink + 1 : network.nextLink,
  };
}

export function removePeerDevice(network: PeerNetwork) {
  if (network.devices.length <= 5) return network;
  const device = network.devices
    .slice()
    .sort((a, b) => a.stability - b.stability || b.load - a.load)[0];
  return {
    ...network,
    devices: network.devices.filter((candidate) => candidate.id !== device.id),
    links: network.links.filter(
      (link) => link.source !== device.id && link.target !== device.id,
    ),
  };
}

export function togglePeerDevice(network: PeerNetwork, id: string) {
  return {
    ...network,
    devices: network.devices.map((device) =>
      device.id === id ? { ...device, online: !device.online } : device,
    ),
  };
}

export function establishPeerLink(network: PeerNetwork) {
  const keys = new Set(network.links.map((link) => linkKey(link.source, link.target)));
  const candidates = network.devices
    .filter((device) => device.online)
    .flatMap((source) =>
      network.devices
        .filter(
          (target) =>
            target.online &&
            source.id !== target.id &&
            !keys.has(linkKey(source.id, target.id)),
        )
        .map((target) => ({ source, target, distance: distance(source, target) })),
    )
    .sort((a, b) => a.distance - b.distance);
  const match = candidates[0];
  if (!match) return network;
  return {
    ...network,
    links: [
      ...network.links,
      makeLink(network.nextLink, match.source.id, match.target.id, 0.58),
    ],
    nextLink: network.nextLink + 1,
  };
}

export function failPeerLink(network: PeerNetwork) {
  if (network.links.length === 0) return network;
  const link = network.links.slice().sort((a, b) => a.quality - b.quality)[0];
  return {
    ...network,
    links: network.links.filter((candidate) => candidate.id !== link.id),
  };
}

export function stepPeerNetwork(network: PeerNetwork, deltaSeconds: number): PeerNetwork {
  const tick = network.tick + 1;
  const degree = new Map<string, number>();
  for (const link of network.links) {
    degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
    degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
  }
  const devices = network.devices.map((device, index) => {
    const localDegree = degree.get(device.id) ?? 0;
    const targetLoad = clamp(
      0.12 + localDegree * 0.085 + sample(tick * 0.19 + index * 9) * 0.42,
    );
    return {
      ...device,
      load: clamp(device.load + (targetLoad - device.load) * deltaSeconds * 0.72),
      stability: clamp(device.stability + (0.74 - device.load - device.stability) * deltaSeconds * 0.12),
    };
  });
  const deviceById = new Map(devices.map((device) => [device.id, device]));
  const links = network.links
    .map((link) => {
      const source = deviceById.get(link.source);
      const target = deviceById.get(link.target);
      if (!source || !target || !source.online || !target.online) return null;
      const strain = (source.load + target.load) * 0.5;
      const quality = clamp(link.quality + (0.63 - strain - link.quality) * deltaSeconds * 0.45);
      if (quality < 0.1) return null;
      return {
        ...link,
        quality,
        traffic: clamp(link.traffic + (strain - link.traffic) * deltaSeconds * 1.8),
      };
    })
    .filter((link): link is PeerLink => link !== null);
  const current = { ...network, devices, links, tick };
  const linkCount = links.length;
  const online = devices.filter((device) => device.online).length;
  if (online > 2 && linkCount < online * 1.35 && sample(tick * 3.7) > 0.987) {
    return establishPeerLink(current);
  }
  return current;
}
