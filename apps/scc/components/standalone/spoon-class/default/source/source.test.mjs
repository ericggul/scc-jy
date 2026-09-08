import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Script } from "node:vm";
import { installRunnerCompatibility } from "./compatibility.mjs";
import { installLifeAgeMeter } from "./life-age.mjs";

const original = readFileSync(new URL("./dino.html", import.meta.url), "utf8");
const packaged = JSON.parse(readFileSync(new URL("./document.json", import.meta.url), "utf8"));

test("vendored HTML matches the pinned upstream bytes", () => {
  const hash = createHash("sha256").update(original).digest("hex");
  assert.equal(hash, "942ee61b111ddd7778cd8204bf9a4a60802d3a63549ec6e9d2353edd6eb5198a");
  assert.equal(packaged.sha256, hash);
});

test("packaging preserves the upstream document outside its explicit integration additions", () => {
  assert.ok(packaged.html.includes(`(${installRunnerCompatibility.toString()})(window.Runner, window);`));
  assert.ok(packaged.html.includes(`(${installLifeAgeMeter.toString()})(window);`));
  const restored = packaged.html
    .replace(/\n<meta http-equiv="Content-Security-Policy"[^>]+>/, "")
    .replace(/<script data-spoon-class-compatibility>[\s\S]*?<\/script>\n/, "")
    .replace(/<script data-spoon-class-life-age>[\s\S]*?<\/script>\n/, "");
  assert.equal(restored, original);
});

test("age meter replaces score with the shared six-months-per-second clock", () => {
  const calls = [];
  const context = {
    save() {},
    restore() {},
    fillRect(...args) {
      calls.push(args);
    },
  };
  const meter = { canvasCtx: context, x: 100, y: 5 };
  const runner = {
    started: true,
    playingIntro: false,
    crashed: false,
    distanceMeter: meter,
    restart() {},
  };
  installLifeAgeMeter({ Runner: { instance_: runner } });
  const atBirth = JSON.stringify(calls);
  calls.length = 0;
  meter.update(1000 / 6);
  assert.notEqual(JSON.stringify(calls), atBirth);
  assert.equal(meter.update(0), false);
});

test("all upstream inline scripts parse without executing a browser", () => {
  const scripts = [...original.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length >= 5);
  for (const [index, match] of scripts.entries()) {
    assert.doesNotThrow(() => new Script(match[1], { filename: `upstream-script-${index}.js` }));
  }
});

test("both sprite densities and all three original Ogg sounds are intact", () => {
  const sprites = [...original.matchAll(/<img id="([12])x-([^"]+)" src="data:image\/png;base64,([^"]+)"/g)];
  assert.equal(sprites.length, 14);
  for (const [, , , data] of sprites) {
    const png = Buffer.from(data, "base64");
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.ok(png.readUInt32BE(16) > 0);
    assert.ok(png.readUInt32BE(20) > 0);
  }
  const sounds = [...original.matchAll(/<audio id="offline-sound-([^"]+)" src="data:audio\/mpeg;base64,([^"]+)"/g)];
  assert.deepEqual(sounds.map((sound) => sound[1]), ["press", "hit", "reached"]);
  for (const [, , data] of sounds) {
    // The source labels these MPEG, but the bytes contain Ogg/Vorbis audio.
    assert.equal(Buffer.from(data, "base64").subarray(0, 4).toString(), "OggS");
  }
});
