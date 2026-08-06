export const backgroundVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const backgroundFragmentShader = `
  precision highp float;

  varying vec2 vUv;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uProgress;
  uniform float uMotion;

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);

    float a = hash21(cell);
    float b = hash21(cell + vec2(1.0, 0.0));
    float c = hash21(cell + vec2(0.0, 1.0));
    float d = hash21(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
  }

  float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 rotation = mat2(0.8, -0.6, 0.6, 0.8);

    for (int octave = 0; octave < 4; octave++) {
      value += noise(point) * amplitude;
      point = rotation * point * 2.04 + 9.13;
      amplitude *= 0.5;
    }

    return value;
  }

  float hash11(float value) {
    return fract(sin(value * 127.1) * 43758.5453123);
  }

  float noise11(float value) {
    float cell = floor(value);
    float local = fract(value);
    local = local * local * (3.0 - 2.0 * local);
    return mix(hash11(cell), hash11(cell + 1.0), local);
  }

  float emissionStrength(float seconds) {
    if (seconds < 0.0) return 0.0;

    float phraseIndex = floor(seconds / 12.0);
    float localTime = seconds - phraseIndex * 12.0;
    float firstDuration = mix(2.8, 5.0, hash11(phraseIndex * 4.13 + 1.7));
    float first = 1.0 - smoothstep(firstDuration - 0.34, firstDuration + 0.46, localTime);

    float firstPause = mix(1.6, 3.0, hash11(phraseIndex * 5.71 + 3.2));
    float secondStart = firstDuration + firstPause;
    float secondDuration = mix(1.4, 3.0, hash11(phraseIndex * 7.31 + 5.8));
    float second = smoothstep(secondStart - 0.3, secondStart + 0.4, localTime);
    second *= 1.0 - smoothstep(
      secondStart + secondDuration - 0.3,
      secondStart + secondDuration + 0.44,
      localTime
    );

    float secondPause = mix(1.2, 2.4, hash11(phraseIndex * 8.93 + 2.4));
    float thirdStart = secondStart + secondDuration + secondPause;
    float thirdDuration = mix(0.8, 1.8, hash11(phraseIndex * 3.97 + 7.6));
    float third = smoothstep(thirdStart - 0.26, thirdStart + 0.34, localTime);
    third *= 1.0 - smoothstep(
      thirdStart + thirdDuration - 0.26,
      thirdStart + thirdDuration + 0.4,
      localTime
    );
    third *= step(0.75, hash11(phraseIndex * 6.17 + 9.1));

    float pressure = mix(0.76, 1.0, noise11(seconds * 0.82 + 8.1));
    return max(first, max(second, third)) * pressure;
  }

  float risingHeight(float progress) {
    float eased = pow(clamp(progress / 0.985, 0.0, 1.0), 0.86);
    float breath = sin(progress * 3.14159265);
    float longSurge = sin(progress * 19.0 - 1.1) * 0.022 * breath;
    float shortSurge = sin(progress * 47.0 + 0.8) * 0.009 * breath;
    return eased * 1.14 + longSurge + shortSurge;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float time = uTime * uMotion;
    float atmosphereReveal = smoothstep(0.0, 0.052, uProgress);
    float front = risingHeight(uProgress);

    vec3 voidColor = vec3(0.006, 0.006, 0.006);
    vec3 deepUmber = vec3(0.141, 0.074, 0.059);
    vec3 walnut = vec3(0.337, 0.200, 0.149);
    vec3 burnishedClay = vec3(0.588, 0.396, 0.294);
    vec3 softCopper = vec3(0.737, 0.537, 0.408);

    vec2 slowDrift = vec2(time * 0.012, -time * 0.009);
    vec2 warp = vec2(
      fbm(uv * vec2(1.7, 2.1) + slowDrift),
      fbm(uv * vec2(1.9, 1.6) - slowDrift + 7.4)
    ) - 0.5;
    float broadFlow = fbm(uv * vec2(2.0, 2.7) + warp * 0.9 + slowDrift);
    float fineFlow = fbm(uv * vec2(5.2, 6.4) - warp * 0.55 - slowDrift * 1.7);

    float waveStrength = smoothstep(0.0, 0.018, uProgress);
    float surfaceWave = (broadFlow - 0.5) * 0.075 * waveStrength;
    surfaceWave += sin(uv.x * 6.5 + time * 0.16) * 0.011 * waveStrength;
    surfaceWave += sin(uv.x * 15.0 - time * 0.09) * 0.004 * waveStrength;
    float localFront = front + surfaceWave;
    float signedDepth = localFront - uv.y;
    float transitionWidth = min(0.075, max(localFront * 0.72, 0.001));
    float fieldMask = smoothstep(0.0, transitionWidth, signedDepth);

    float leftAtmosphere = 1.0 - smoothstep(
      0.08,
      0.88,
      distance(uv * vec2(aspect, 1.0), vec2(0.05 * aspect, 0.18))
    );
    float rightAtmosphere = 1.0 - smoothstep(
      0.04,
      0.82,
      distance(uv * vec2(aspect, 1.0), vec2(0.94 * aspect, 0.72))
    );
    vec3 atmosphere = deepUmber;
    atmosphere = mix(atmosphere, walnut, broadFlow * 0.38 + leftAtmosphere * 0.16);
    atmosphere = mix(atmosphere, burnishedClay, rightAtmosphere * 0.08);
    vec3 color = mix(voidColor, atmosphere, atmosphereReveal * 0.42);

    float normalizedDepth = clamp(signedDepth / max(localFront, 0.08), 0.0, 1.0);
    vec2 fieldUv = uv * vec2(aspect, 1.0);
    float leftPool = 1.0 - smoothstep(
      0.04,
      0.74,
      distance(fieldUv, vec2((0.12 + sin(time * 0.018) * 0.06) * aspect, 0.2))
    );
    float rightPool = 1.0 - smoothstep(
      0.05,
      0.68,
      distance(fieldUv, vec2((0.86 + cos(time * 0.014) * 0.05) * aspect, 0.6))
    );
    vec3 fieldColor = mix(deepUmber, walnut, 0.28 + broadFlow * 0.5);
    fieldColor = mix(fieldColor, burnishedClay, leftPool * (0.08 + fineFlow * 0.12));
    fieldColor = mix(fieldColor, softCopper, rightPool * 0.045);
    fieldColor = mix(fieldColor, deepUmber, normalizedDepth * 0.18);
    color = mix(color, fieldColor, fieldMask);

    float spine = 0.5;
    spine += sin(time * 0.052) * 0.045;
    spine += sin(uv.y * 4.6 + time * 0.2) * 0.019;
    spine += sin(uv.y * 11.0 - time * 0.11) * 0.007;
    spine += (fbm(vec2(uv.y * 2.3, time * 0.019)) - 0.5) * 0.016;
    float filamentDistance = abs(uv.x - spine) * aspect;
    float filament = 1.0 - smoothstep(0.003, 0.047, filamentDistance);
    filament *= smoothstep(localFront - 0.015, localFront + 0.055, uv.y);
    filament *= 1.0 - smoothstep(0.97, 1.08, uv.y);
    float fallSpan = max(1.12 - localFront, 0.08);
    float normalizedFall = clamp((1.12 - uv.y) / fallSpan, 0.0, 1.0);
    float filamentTravel = pow(normalizedFall, 1.0 / 1.16);
    float filamentEmissionTime = time - filamentTravel * 2.25;
    filament *= emissionStrength(filamentEmissionTime);
    float filamentTexture = 0.48 + fineFlow * 0.52;
    color = mix(color, burnishedClay, filament * filamentTexture * 0.29);

    float vignette = 1.0 - smoothstep(0.34, 0.92, distance(uv, vec2(0.5)));
    color *= mix(0.82, 1.0, vignette);
    float grain = hash21(gl_FragCoord.xy + floor(time * 10.0)) - 0.5;
    color += grain * 0.006 * atmosphereReveal;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const particleVertexShader = `
  precision highp float;

  attribute vec4 aSeed;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uProgress;
  uniform float uMotion;
  uniform float uPixelRatio;
  uniform float uLayer;

  varying float vAlpha;
  varying float vTone;
  varying float vLayer;
  varying float vStretch;
  varying float vSoftness;

  float risingHeight(float progress) {
    float eased = pow(clamp(progress / 0.985, 0.0, 1.0), 0.86);
    float breath = sin(progress * 3.14159265);
    float longSurge = sin(progress * 19.0 - 1.1) * 0.022 * breath;
    float shortSurge = sin(progress * 47.0 + 0.8) * 0.009 * breath;
    return eased * 1.14 + longSurge + shortSurge;
  }

  float hash11(float value) {
    return fract(sin(value * 127.1) * 43758.5453123);
  }

  float noise11(float value) {
    float cell = floor(value);
    float local = fract(value);
    local = local * local * (3.0 - 2.0 * local);
    return mix(hash11(cell), hash11(cell + 1.0), local);
  }

  float emissionStrength(float seconds) {
    if (seconds < 0.0) return 0.0;

    float phraseIndex = floor(seconds / 12.0);
    float localTime = seconds - phraseIndex * 12.0;
    float firstDuration = mix(2.8, 5.0, hash11(phraseIndex * 4.13 + 1.7));
    float first = 1.0 - smoothstep(firstDuration - 0.34, firstDuration + 0.46, localTime);

    float firstPause = mix(1.6, 3.0, hash11(phraseIndex * 5.71 + 3.2));
    float secondStart = firstDuration + firstPause;
    float secondDuration = mix(1.4, 3.0, hash11(phraseIndex * 7.31 + 5.8));
    float second = smoothstep(secondStart - 0.3, secondStart + 0.4, localTime);
    second *= 1.0 - smoothstep(
      secondStart + secondDuration - 0.3,
      secondStart + secondDuration + 0.44,
      localTime
    );

    float secondPause = mix(1.2, 2.4, hash11(phraseIndex * 8.93 + 2.4));
    float thirdStart = secondStart + secondDuration + secondPause;
    float thirdDuration = mix(0.8, 1.8, hash11(phraseIndex * 3.97 + 7.6));
    float third = smoothstep(thirdStart - 0.26, thirdStart + 0.34, localTime);
    third *= 1.0 - smoothstep(
      thirdStart + thirdDuration - 0.26,
      thirdStart + thirdDuration + 0.4,
      localTime
    );
    third *= step(0.75, hash11(phraseIndex * 6.17 + 9.1));

    float pressure = mix(0.76, 1.0, noise11(seconds * 0.82 + 8.1));
    return max(first, max(second, third)) * pressure;
  }

  void main() {
    float time = uTime * uMotion;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float front = risingHeight(uProgress);
    vec2 particlePosition;
    float pointSize;

    if (uLayer < 0.5) {
      float baseY = aSeed.y * 1.08;
      float waveStrength = smoothstep(0.0, 0.018, uProgress);
      float localFront = front;
      localFront += sin(aSeed.x * 6.5 + time * 0.16) * 0.014 * waveStrength;
      localFront += sin(aSeed.x * 15.0 - time * 0.09) * 0.006 * waveStrength;
      localFront += (aSeed.z - 0.5) * 0.095 * waveStrength;

      float horizontalFlow = sin(baseY * 7.0 + time * 0.11 + aSeed.z * 6.283) * 0.014;
      horizontalFlow += sin(baseY * 17.0 - time * 0.07 + aSeed.w * 4.0) * 0.006;
      float verticalFlow = sin(aSeed.x * 8.0 - time * 0.08 + aSeed.z * 5.0) * 0.008;
      particlePosition = vec2(aSeed.x + horizontalFlow / aspect, baseY + verticalFlow);

      float inside = 1.0 - smoothstep(localFront - 0.018, localFront, baseY);
      float edge = exp(-abs(baseY - localFront) * 5.5);
      vAlpha = inside * mix(0.08, 0.34, aSeed.w) * (0.78 + edge * 0.28);
      pointSize = mix(1.0, 3.3, aSeed.w) * (0.88 + edge * 0.24);
      vStretch = mix(1.0, 1.6, aSeed.z);
      vSoftness = mix(0.18, 0.34, aSeed.w);
    } else {
      float fallDuration = mix(1.8, 2.7, aSeed.z);
      float travel = fract(aSeed.y + time / fallDuration);
      float emissionTime = time - travel * fallDuration;
      float emission = emissionStrength(emissionTime);
      float easedTravel = pow(travel, 1.16);
      float target = min(front, 0.99);
      float particleY = mix(1.12, target, easedTravel);
      float spine = 0.5 + sin(time * 0.052) * 0.045;
      spine += sin(particleY * 4.6 + time * 0.2) * 0.019;
      spine += sin(particleY * 11.0 - time * 0.11) * 0.007;
      float pulse = 0.5 + 0.5 * sin(time * 0.23 - travel * 8.0);
      float filamentWidth = mix(0.011, 0.037, sin(travel * 3.14159265));
      filamentWidth *= mix(0.82, 1.16, pulse);
      float lane = (aSeed.x - 0.5) * filamentWidth;
      float filamentFlow = sin(travel * 14.0 + aSeed.z * 7.0 + time * 0.13) * 0.0035;
      particlePosition = vec2(spine + lane / aspect + filamentFlow / aspect, particleY);

      float endFade = pow(sin(travel * 3.14159265), 0.34);
      float veilParticle = smoothstep(0.7, 1.0, aSeed.w);
      float coreAlpha = mix(0.34, 0.82, aSeed.w);
      float veilAlpha = mix(0.07, 0.18, aSeed.z);
      vAlpha = endFade * emission * mix(coreAlpha, veilAlpha, veilParticle);
      pointSize = mix(
        mix(1.4, 3.8, aSeed.w),
        mix(10.0, 24.0, aSeed.z),
        veilParticle
      );
      vStretch = mix(mix(1.6, 3.0, aSeed.z), mix(3.2, 5.5, aSeed.z), veilParticle);
      vSoftness = mix(0.14, 0.38, veilParticle);
    }

    vTone = aSeed.z;
    vLayer = uLayer;
    gl_PointSize = pointSize * uPixelRatio;
    gl_Position = vec4(
      particlePosition.x * 2.0 - 1.0,
      particlePosition.y * 2.0 - 1.0,
      0.0,
      1.0
    );
  }
`;

export const particleFragmentShader = `
  precision highp float;

  varying float vAlpha;
  varying float vTone;
  varying float vLayer;
  varying float vStretch;
  varying float vSoftness;

  void main() {
    vec2 centered = gl_PointCoord - 0.5;
    vec2 shaped = vec2(centered.x * vStretch, centered.y);
    float distanceFromCenter = length(shaped);
    float softDisc = 1.0 - smoothstep(vSoftness, 0.5, distanceFromCenter);
    if (softDisc <= 0.0 || vAlpha <= 0.001) discard;

    vec3 deepUmber = vec3(0.141, 0.074, 0.059);
    vec3 walnut = vec3(0.337, 0.200, 0.149);
    vec3 burnishedClay = vec3(0.588, 0.396, 0.294);
    vec3 softCopper = vec3(0.737, 0.537, 0.408);
    vec3 reservoirColor = mix(walnut, burnishedClay, vTone * 0.48);
    vec3 filamentColor = mix(walnut, burnishedClay, 0.28 + vTone * 0.42);
    vec3 color = mix(reservoirColor, filamentColor, step(0.5, vLayer));
    color = mix(deepUmber, color, 0.84);

    gl_FragColor = vec4(color, softDisc * vAlpha);
  }
`;
