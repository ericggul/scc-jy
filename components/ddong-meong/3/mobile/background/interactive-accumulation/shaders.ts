export const backgroundVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const sharedAccumulationShader = `
  uniform float uPhraseDuration;
  uniform vec2 uFirstDuration;
  uniform vec2 uFirstPause;
  uniform vec2 uSecondDuration;
  uniform vec2 uSecondPause;
  uniform vec2 uThirdDuration;
  uniform float uThirdProbability;
  uniform vec2 uPressure;
  uniform float uPressureFrequency;
  uniform float uRhythmSeed;
  uniform float uCompletionProgress;
  uniform float uRiseExponent;
  uniform float uFinalHeight;
  uniform vec3 uLongSurge;
  uniform vec3 uShortSurge;

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

    float phraseIndex = floor(seconds / uPhraseDuration);
    float localTime = seconds - phraseIndex * uPhraseDuration;
    float firstDuration = mix(
      uFirstDuration.x,
      uFirstDuration.y,
      hash11(phraseIndex * 4.13 + 1.7 + uRhythmSeed)
    );
    float first = 1.0 - smoothstep(
      firstDuration - 0.34,
      firstDuration + 0.46,
      localTime
    );

    float firstPause = mix(
      uFirstPause.x,
      uFirstPause.y,
      hash11(phraseIndex * 5.71 + 3.2 + uRhythmSeed)
    );
    float secondStart = firstDuration + firstPause;
    float secondDuration = mix(
      uSecondDuration.x,
      uSecondDuration.y,
      hash11(phraseIndex * 7.31 + 5.8 + uRhythmSeed)
    );
    float second = smoothstep(
      secondStart - 0.3,
      secondStart + 0.4,
      localTime
    );
    second *= 1.0 - smoothstep(
      secondStart + secondDuration - 0.3,
      secondStart + secondDuration + 0.44,
      localTime
    );

    float secondPause = mix(
      uSecondPause.x,
      uSecondPause.y,
      hash11(phraseIndex * 8.93 + 2.4 + uRhythmSeed)
    );
    float thirdStart = secondStart + secondDuration + secondPause;
    float thirdDuration = mix(
      uThirdDuration.x,
      uThirdDuration.y,
      hash11(phraseIndex * 3.97 + 7.6 + uRhythmSeed)
    );
    float third = smoothstep(
      thirdStart - 0.26,
      thirdStart + 0.34,
      localTime
    );
    third *= 1.0 - smoothstep(
      thirdStart + thirdDuration - 0.26,
      thirdStart + thirdDuration + 0.4,
      localTime
    );
    third *= step(
      1.0 - uThirdProbability,
      hash11(phraseIndex * 6.17 + 9.1 + uRhythmSeed)
    );

    float pressure = mix(
      uPressure.x,
      uPressure.y,
      noise11(seconds * uPressureFrequency + 8.1 + uRhythmSeed)
    );
    return max(first, max(second, third)) * pressure;
  }

  float risingHeight(float progress) {
    float eased = pow(
      clamp(progress / uCompletionProgress, 0.0, 1.0),
      uRiseExponent
    );
    float breath = sin(progress * 3.14159265);
    float longSurge = sin(progress * uLongSurge.y + uLongSurge.z);
    longSurge *= uLongSurge.x * breath;
    float shortSurge = sin(progress * uShortSurge.y + uShortSurge.z);
    shortSurge *= uShortSurge.x * breath;
    return eased * uFinalHeight + longSurge + shortSurge;
  }
`;

export const backgroundFragmentShader = `
  precision highp float;

  varying vec2 vUv;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uProgress;
  uniform float uMotion;
  uniform float uDropAge;
  uniform vec2 uDropOrigin;
  uniform float uFlushProgress;
  uniform vec3 uVoidColor;
  uniform vec3 uDeepColor;
  uniform vec3 uMiddleColor;
  uniform vec3 uSurfaceColor;
  uniform vec3 uHighlightColor;
  uniform float uMaterialMode;
  uniform float uBoundaryTransitionMaximum;
  uniform float uBoundaryShallowDepthRatio;
  uniform vec3 uBoundaryWaves;
  uniform vec2 uBoundaryHighlight;
  uniform float uFlowSpeed;
  uniform float uBackgroundFallDuration;
  uniform float uFallTravelExponent;
  uniform vec3 uFallWander;
  uniform vec2 uBackgroundFilamentWidth;
  uniform float uFallTurbulence;
  uniform float uBackgroundFilamentOpacity;

  ${sharedAccumulationShader}

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

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float time = uTime * uMotion;
    float flushProgress = clamp(uFlushProgress, 0.0, 1.0);
    float drainProgress = smoothstep(0.06, 0.9, flushProgress);
    float frozenFront = risingHeight(uProgress);
    float atmosphereReveal = smoothstep(0.0, 0.052, uProgress);
    atmosphereReveal *= 1.0 - smoothstep(0.2, 0.96, flushProgress);
    float front = frozenFront * (1.0 - drainProgress);

    float flowTime = time * uFlowSpeed;

    vec2 slowDrift = vec2(flowTime * 0.012, -flowTime * 0.009);
    vec2 warp = vec2(
      fbm(uv * vec2(1.7, 2.1) + slowDrift),
      fbm(uv * vec2(1.9, 1.6) - slowDrift + 7.4)
    ) - 0.5;
    float broadFlow = fbm(uv * vec2(2.0, 2.7) + warp * 0.9 + slowDrift);
    float fineFlow = fbm(uv * vec2(5.2, 6.4) - warp * 0.55 - slowDrift * 1.7);

    float waveStrength = smoothstep(0.0, 0.018, uProgress);
    float surfaceWave = (broadFlow - 0.5) * uBoundaryWaves.x * waveStrength;
    surfaceWave += sin(uv.x * 6.5 + flowTime * 0.16) * uBoundaryWaves.y * waveStrength;
    surfaceWave += sin(uv.x * 15.0 - flowTime * 0.09) * uBoundaryWaves.z * waveStrength;
    surfaceWave *= 1.0 - drainProgress;
    float funnel = exp(
      -pow(abs((uv.x - 0.5) * aspect) / 0.2, 2.0)
    );
    funnel *= sin(drainProgress * 3.14159265) * min(frozenFront, 1.0) * 0.2;
    float localFront = front + surfaceWave - funnel;
    float signedDepth = localFront - uv.y;
    float transitionWidth = min(
      uBoundaryTransitionMaximum,
      max(localFront * uBoundaryShallowDepthRatio, 0.001)
    );
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
    vec3 atmosphere = uDeepColor;
    atmosphere = mix(atmosphere, uMiddleColor, broadFlow * 0.38 + leftAtmosphere * 0.16);
    atmosphere = mix(atmosphere, uSurfaceColor, rightAtmosphere * 0.08);
    vec3 color = mix(uVoidColor, atmosphere, atmosphereReveal * 0.42);

    float normalizedDepth = clamp(signedDepth / max(localFront, 0.08), 0.0, 1.0);
    vec2 fieldUv = uv * vec2(aspect, 1.0);
    vec2 drainCenter = vec2(0.5 * aspect, -0.08);
    vec2 drainVector = fieldUv - drainCenter;
    float drainRadius = length(drainVector);
    float drainAngle = -sin(drainProgress * 3.14159265);
    drainAngle *= 2.1 * (1.0 - smoothstep(0.08, 1.0, drainRadius));
    mat2 drainRotation = mat2(
      cos(drainAngle),
      -sin(drainAngle),
      sin(drainAngle),
      cos(drainAngle)
    );
    fieldUv = drainCenter + drainRotation * drainVector;
    float leftPool = 1.0 - smoothstep(
      0.04,
      0.74,
      distance(fieldUv, vec2((0.12 + sin(flowTime * 0.018) * 0.06) * aspect, 0.2))
    );
    float rightPool = 1.0 - smoothstep(
      0.05,
      0.68,
      distance(fieldUv, vec2((0.86 + cos(flowTime * 0.014) * 0.05) * aspect, 0.6))
    );
    vec3 fieldColor = mix(uDeepColor, uMiddleColor, 0.28 + broadFlow * 0.5);
    fieldColor = mix(fieldColor, uSurfaceColor, leftPool * (0.08 + fineFlow * 0.12));
    fieldColor = mix(fieldColor, uHighlightColor, rightPool * 0.045);
    fieldColor = mix(fieldColor, uDeepColor, normalizedDepth * 0.18);
    color = mix(color, fieldColor, fieldMask);
    float boundaryHighlight = 1.0 - smoothstep(
      0.0,
      uBoundaryHighlight.y,
      abs(signedDepth)
    );
    color = mix(
      color,
      uHighlightColor,
      boundaryHighlight * uBoundaryHighlight.x * (1.0 - drainProgress)
    );

    float spawnY = uDropOrigin.y;
    float fallTarget = min(localFront, spawnY - 0.025);
    float fallSpan = max(spawnY - fallTarget, 0.08);
    float normalizedFall = clamp((spawnY - uv.y) / fallSpan, 0.0, 1.0);
    float filamentTravel = pow(normalizedFall, 1.0 / uFallTravelExponent);
    float spine = uDropOrigin.x;
    spine += sin(flowTime * 0.052) * uFallWander.x * filamentTravel;
    spine += sin(uv.y * 4.6 + flowTime * 0.2) * uFallWander.y * filamentTravel;
    spine += sin(uv.y * 11.0 - flowTime * 0.11) * uFallWander.z * filamentTravel;
    spine += (fbm(vec2(uv.y * 2.3, flowTime * 0.019)) - 0.5) * uFallTurbulence * filamentTravel;
    float filamentDistance = abs(uv.x - spine) * aspect;
    if (uMaterialMode > 4.5) {
      float leftDistance = abs(uv.x - (spine - 0.13)) * aspect;
      float rightDistance = abs(uv.x - (spine + 0.13)) * aspect;
      filamentDistance = min(leftDistance, rightDistance);
    }
    float filament = 1.0 - smoothstep(
      uBackgroundFilamentWidth.x,
      uBackgroundFilamentWidth.y,
      filamentDistance
    );
    filament *= smoothstep(fallTarget - 0.015, fallTarget + 0.055, uv.y);
    filament *= 1.0 - smoothstep(spawnY - 0.012, spawnY + 0.028, uv.y);
    float dropAgeAtHeight = uDropAge - filamentTravel * uBackgroundFallDuration;
    float dropTrail = smoothstep(0.0, 0.08, dropAgeAtHeight);
    dropTrail *= 1.0 - smoothstep(0.18, 0.42, dropAgeAtHeight);
    filament *= dropTrail;
    filament *= 1.0 - smoothstep(0.0, 0.14, flushProgress);
    if (uMaterialMode > 1.5 && uMaterialMode < 2.5) filament = 0.0;
    if (uMaterialMode > 3.5 && uMaterialMode < 4.5) filament = 0.0;
    float filamentTexture = 0.48 + fineFlow * 0.52;
    color = mix(
      color,
      uSurfaceColor,
      filament * filamentTexture * uBackgroundFilamentOpacity
    );

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
  attribute vec2 aDropOrigin;
  attribute vec2 aDropPreviousOrigin;
  attribute float aDropStartedAt;
  attribute float aDropActive;
  attribute float aDropVisualStrength;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uInteractionTime;
  uniform float uProgress;
  uniform float uMotion;
  uniform float uDropAge;
  uniform vec2 uDropOrigin;
  uniform float uFlushProgress;
  uniform float uPixelRatio;
  uniform float uLayer;
  uniform float uMaterialMode;
  uniform vec3 uBoundaryWaves;
  uniform vec3 uReservoirBoundary;
  uniform float uFlowSpeed;
  uniform vec3 uReservoirFlow;
  uniform vec2 uFallDuration;
  uniform float uFallTravelExponent;
  uniform vec3 uFallWander;
  uniform vec2 uFallLaneWidth;
  uniform vec2 uFallWidthPulse;
  uniform float uFallMicroFlow;
  uniform vec2 uReservoirAlpha;
  uniform vec2 uReservoirPointSize;
  uniform vec2 uReservoirStretch;
  uniform vec2 uReservoirSoftness;
  uniform vec2 uCoreAlpha;
  uniform vec2 uVeilAlpha;
  uniform float uVeilThreshold;
  uniform vec2 uCorePointSize;
  uniform vec2 uVeilPointSize;
  uniform vec2 uCoreStretch;
  uniform vec2 uVeilStretch;
  uniform float uCoreSoftness;
  uniform float uVeilSoftness;

  ${sharedAccumulationShader}

  varying float vAlpha;
  varying float vTone;
  varying float vLayer;
  varying float vStretch;
  varying float vSoftness;

  void main() {
    float time = uTime * uMotion;
    float flowTime = time * uFlowSpeed;
    float flushProgress = clamp(uFlushProgress, 0.0, 1.0);
    float drainProgress = smoothstep(0.04, 0.92, flushProgress);
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float front = risingHeight(uProgress);
    vec2 particlePosition;
    float pointSize;

    if (uLayer < 0.5) {
      float baseY = aSeed.y * 1.08;
      float waveStrength = smoothstep(0.0, 0.018, uProgress);
      float localFront = front;
      localFront += sin(aSeed.x * 6.5 + flowTime * 0.16) * uReservoirBoundary.x * waveStrength;
      localFront += sin(aSeed.x * 15.0 - flowTime * 0.09) * uReservoirBoundary.y * waveStrength;
      localFront += (aSeed.z - 0.5) * uReservoirBoundary.z * waveStrength;

      float horizontalFlow = sin(baseY * 7.0 + flowTime * 0.11 + aSeed.z * 6.283) * uReservoirFlow.x;
      horizontalFlow += sin(baseY * 17.0 - flowTime * 0.07 + aSeed.w * 4.0) * uReservoirFlow.y;
      float verticalFlow = sin(aSeed.x * 8.0 - flowTime * 0.08 + aSeed.z * 5.0) * uReservoirFlow.z;
      particlePosition = vec2(aSeed.x + horizontalFlow / aspect, baseY + verticalFlow);

      float suctionPulse = sin(drainProgress * 3.14159265);
      float swirl = sin(baseY * 19.0 + aSeed.z * 8.0 + drainProgress * 13.0);
      swirl *= suctionPulse * 0.045 / aspect;
      particlePosition.x = mix(
        particlePosition.x,
        0.5 + swirl,
        pow(drainProgress, 1.25)
      );
      particlePosition.y = mix(
        particlePosition.y,
        -0.12 - aSeed.w * 0.1,
        drainProgress
      );

      float inside = 1.0 - smoothstep(localFront - 0.018, localFront, baseY);
      float edge = exp(-abs(baseY - localFront) * 5.5);
      vAlpha = inside * mix(uReservoirAlpha.x, uReservoirAlpha.y, aSeed.w) * (0.78 + edge * 0.28);
      vAlpha *= 1.0 - smoothstep(0.86, 1.0, drainProgress);
      pointSize = mix(uReservoirPointSize.x, uReservoirPointSize.y, aSeed.w) * (0.88 + edge * 0.24);
      pointSize *= mix(1.0, 0.58, drainProgress);
      vStretch = mix(uReservoirStretch.x, uReservoirStretch.y, aSeed.z);
      vSoftness = mix(uReservoirSoftness.x, uReservoirSoftness.y, aSeed.w);
    } else {
      float fallDuration = mix(uFallDuration.x, uFallDuration.y, aSeed.z);
      float localDropAge = uInteractionTime - aDropStartedAt;
      float travel = clamp(localDropAge / fallDuration, 0.0, 1.0);
      float emission = aDropActive * step(0.0, localDropAge);
      emission *= 1.0 - step(fallDuration, localDropAge);
      float easedTravel = pow(travel, uFallTravelExponent);
      vec2 spawnOrigin = mix(aDropPreviousOrigin, aDropOrigin, aSeed.x);
      float spawnY = spawnOrigin.y;
      float target = min(front, spawnY - 0.025);
      float particleY = mix(spawnY, target, easedTravel);
      float spine = spawnOrigin.x + sin(flowTime * 0.052) * uFallWander.x * travel;
      spine += sin(particleY * 4.6 + flowTime * 0.2) * uFallWander.y * travel;
      spine += sin(particleY * 11.0 - flowTime * 0.11) * uFallWander.z * travel;
      float pulse = 0.5 + 0.5 * sin(flowTime * 0.23 - travel * 8.0);
      float filamentWidth = mix(uFallLaneWidth.x, uFallLaneWidth.y, sin(travel * 3.14159265));
      filamentWidth *= mix(uFallWidthPulse.x, uFallWidthPulse.y, pulse);
      float lane = (aSeed.x - 0.5) * filamentWidth;
      float filamentFlow = sin(travel * 14.0 + aSeed.z * 7.0 + flowTime * 0.13) * uFallMicroFlow;
      particlePosition = vec2(spine + lane / aspect + filamentFlow / aspect, particleY);

      if (uMaterialMode > 2.5 && uMaterialMode < 3.5) {
        float columnLane = (aSeed.x - 0.5) * filamentWidth * 2.8;
        float columnDepth = (aSeed.w - 0.5) * 0.028;
        particlePosition = vec2(
          spine + columnLane / aspect + filamentFlow / aspect,
          particleY + columnDepth
        );
      }
      if (uMaterialMode > 3.5 && uMaterialMode < 4.5) {
        float mistDrift = sin(
          flowTime * 0.11 + aSeed.z * 9.0 + particleY * 5.0
        ) * 0.045;
        particlePosition.x = clamp(
          spawnOrigin.x + (aSeed.x - 0.5) * 0.85 + mistDrift,
          0.0,
          1.0
        );
        particlePosition.y += (aSeed.w - 0.5) * 0.045;
      }
      if (uMaterialMode > 4.5) {
        float side = step(0.5, aSeed.x) * 2.0 - 1.0;
        float localSeed = fract(aSeed.x * 2.0);
        float burstLane = (localSeed - 0.5) * filamentWidth * 2.2;
        float spray = sin(travel * 18.0 + aSeed.z * 11.0) * 0.012;
        particlePosition.x = spine + side * 0.13;
        particlePosition.x += (burstLane + spray) / aspect;
        particlePosition.y += (aSeed.w - 0.5) * 0.035;
      }

      float endFade = pow(sin(travel * 3.14159265), 0.34);
      float veilParticle = smoothstep(uVeilThreshold, 1.0, aSeed.w);
      float coreAlpha = mix(uCoreAlpha.x, uCoreAlpha.y, aSeed.w);
      float veilAlpha = mix(uVeilAlpha.x, uVeilAlpha.y, aSeed.z);
      vAlpha = endFade * emission * mix(coreAlpha, veilAlpha, veilParticle);
      vAlpha *= aDropVisualStrength;
      vAlpha *= 1.0 - smoothstep(0.0, 0.12, flushProgress);
      if (uMaterialMode > 1.5 && uMaterialMode < 2.5) vAlpha = 0.0;
      pointSize = mix(
        mix(uCorePointSize.x, uCorePointSize.y, aSeed.w),
        mix(uVeilPointSize.x, uVeilPointSize.y, aSeed.z),
        veilParticle
      );
      vStretch = mix(
        mix(uCoreStretch.x, uCoreStretch.y, aSeed.z),
        mix(uVeilStretch.x, uVeilStretch.y, aSeed.z),
        veilParticle
      );
      vSoftness = mix(uCoreSoftness, uVeilSoftness, veilParticle);
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

  uniform vec3 uDeepColor;
  uniform vec3 uMiddleColor;
  uniform vec3 uSurfaceColor;

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

    vec3 reservoirColor = mix(uMiddleColor, uSurfaceColor, vTone * 0.48);
    vec3 filamentColor = mix(uMiddleColor, uSurfaceColor, 0.28 + vTone * 0.42);
    vec3 color = mix(reservoirColor, filamentColor, step(0.5, vLayer));
    color = mix(uDeepColor, color, 0.84);

    gl_FragColor = vec4(color, softDisc * vAlpha);
  }
`;

export const solidDropVertexShader = `
  precision highp float;

  attribute vec4 aSeed;
  attribute vec2 aDropOrigin;
  attribute vec2 aDropPreviousOrigin;
  attribute float aDropStartedAt;
  attribute float aDropActive;
  attribute float aDropVisualStrength;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uInteractionTime;
  uniform float uProgress;
  uniform float uMotion;
  uniform float uDropAge;
  uniform vec2 uDropOrigin;
  uniform float uFlushProgress;
  uniform vec2 uFallDuration;
  uniform float uFallTravelExponent;
  uniform vec3 uFallWander;
  uniform vec2 uSolidSize;
  uniform vec2 uSolidAspect;
  uniform float uSolidRotation;

  ${sharedAccumulationShader}

  varying vec2 vSolidUv;
  varying float vSolidAlpha;
  varying vec2 vSolidSeed;

  void main() {
    float time = uTime * uMotion;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float fallDuration = mix(uFallDuration.x, uFallDuration.y, aSeed.z);
    float localDropAge = uInteractionTime - aDropStartedAt;
    float travel = clamp(localDropAge / fallDuration, 0.0, 1.0);
    float emission = aDropActive * step(0.0, localDropAge);
    emission *= 1.0 - step(fallDuration, localDropAge);
    float front = risingHeight(uProgress);
    vec2 spawnOrigin = mix(aDropPreviousOrigin, aDropOrigin, aSeed.x);
    float spawnY = spawnOrigin.y;
    float target = min(front, spawnY - 0.025);
    float easedTravel = pow(travel, uFallTravelExponent);
    float centerY = mix(spawnY, target, easedTravel);

    float slowWander = sin(time * 0.052 + aSeed.z * 5.7) * uFallWander.x * travel;
    float centerX = spawnOrigin.x + slowWander;

    float size = mix(uSolidSize.x, uSolidSize.y, aSeed.w);
    float solidAspect = mix(uSolidAspect.x, uSolidAspect.y, aSeed.z);
    float angle = (aSeed.w - 0.5) * 2.0 * uSolidRotation;
    angle += sin(time * 0.17 + aSeed.x * 8.0) * uSolidRotation * 0.22;
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 local = rotation * position.xy;
    local *= vec2(size * solidAspect / aspect, size);

    float arrivalFade = smoothstep(0.0, 0.075, centerY - target);
    float travelFade = pow(max(sin(travel * 3.14159265), 0.0), 0.22);
    vSolidAlpha = emission * arrivalFade * travelFade * aDropVisualStrength;
    vSolidAlpha *= 1.0 - smoothstep(0.0, 0.12, uFlushProgress);
    vSolidUv = uv;
    vSolidSeed = aSeed.xz;
    gl_Position = vec4(
      centerX * 2.0 - 1.0 + local.x,
      centerY * 2.0 - 1.0 + local.y,
      0.0,
      1.0
    );
  }
`;

export const solidDropFragmentShader = `
  precision highp float;

  uniform vec3 uDeepColor;
  uniform vec3 uMiddleColor;
  uniform vec3 uSurfaceColor;
  uniform vec3 uHighlightColor;
  uniform float uSolidCurvature;
  uniform float uSolidRoughness;

  varying vec2 vSolidUv;
  varying float vSolidAlpha;
  varying vec2 vSolidSeed;

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
  }

  void main() {
    vec2 point = (vSolidUv - 0.5) * 2.0;
    float vertical = clamp(point.y, -1.0, 1.0);
    float curve = sin(vertical * 2.4 + vSolidSeed.x * 6.283);
    curve *= uSolidCurvature * (1.0 - vertical * vertical);
    float localX = point.x - curve;

    float taper = sqrt(max(0.0, 1.0 - vertical * vertical));
    float contourNoise = sin(vertical * 13.0 + vSolidSeed.y * 17.0);
    contourNoise += sin(vertical * 29.0 - vSolidSeed.x * 11.0) * 0.45;
    float width = taper * (0.72 + (vSolidSeed.y - 0.5) * 0.12);
    width *= 1.0 + contourNoise * uSolidRoughness;
    float sideDistance = abs(localX) - width;
    float endDistance = abs(vertical) - 0.965;
    float signedDistance = max(sideDistance, endDistance);
    float edge = 1.0 - smoothstep(-0.025, 0.025, signedDistance);
    if (edge <= 0.001 || vSolidAlpha <= 0.001) discard;

    float across = clamp(localX / max(width, 0.04), -1.0, 1.0);
    float diffuse = 0.54 - across * 0.2 + (1.0 - abs(vertical)) * 0.08;
    float surfaceNoise = hash21(
      floor(vSolidUv * vec2(42.0, 68.0) + vSolidSeed * 37.0)
    ) - 0.5;
    diffuse += surfaceNoise * 0.12;
    vec3 color = mix(uDeepColor, uMiddleColor, clamp(diffuse, 0.0, 1.0));
    color = mix(
      color,
      uSurfaceColor,
      smoothstep(0.55, 0.92, diffuse) * 0.34
    );
    float restrainedHighlight = smoothstep(0.72, 1.0, diffuse) * 0.08;
    color = mix(color, uHighlightColor, restrainedHighlight);

    gl_FragColor = vec4(color, edge * vSolidAlpha);
  }
`;
