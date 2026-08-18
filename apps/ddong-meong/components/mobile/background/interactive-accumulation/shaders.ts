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
  uniform float uFallSpawnHeight;
  uniform float uFallLaneCenter;
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
    float vortexProgress = pow(drainProgress, 0.58);
    float drainCore = 1.0 - smoothstep(0.08, 1.08, drainRadius);
    float drainAngle = vortexProgress * (0.86 + drainCore * 3.9);
    mat2 drainRotation = mat2(
      cos(drainAngle),
      -sin(drainAngle),
      sin(drainAngle),
      cos(drainAngle)
    );
    float sourceExpansion = mix(1.0, 2.12, vortexProgress);
    fieldUv = drainCenter + drainRotation * drainVector * sourceExpansion;
    vec2 fieldWarp = vec2(
      fbm(fieldUv * vec2(1.7, 2.1) + slowDrift),
      fbm(fieldUv * vec2(1.9, 1.6) - slowDrift + 7.4)
    ) - 0.5;
    float fieldBroadFlow = fbm(
      fieldUv * vec2(2.0, 2.7) + fieldWarp * 0.9 + slowDrift
    );
    float fieldFineFlow = fbm(
      fieldUv * vec2(5.2, 6.4) - fieldWarp * 0.55 - slowDrift * 1.7
    );
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
    vec3 restingFieldColor = mix(
      uDeepColor,
      uMiddleColor,
      0.28 + broadFlow * 0.5
    );
    restingFieldColor = mix(
      restingFieldColor,
      uSurfaceColor,
      leftPool * (0.08 + fineFlow * 0.12)
    );
    restingFieldColor = mix(restingFieldColor, uHighlightColor, rightPool * 0.045);
    vec3 vortexFieldColor = mix(
      uDeepColor,
      uMiddleColor,
      0.22 + fieldBroadFlow * 0.6
    );
    vortexFieldColor = mix(
      vortexFieldColor,
      uSurfaceColor,
      0.04 + fieldFineFlow * 0.18
    );
    vortexFieldColor = mix(vortexFieldColor, uHighlightColor, leftPool * 0.07);
    vec3 fieldColor = mix(restingFieldColor, vortexFieldColor, vortexProgress);
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

    float spine = uFallLaneCenter;
    spine += sin(flowTime * 0.052) * uFallWander.x;
    spine += sin(uv.y * 4.6 + flowTime * 0.2) * uFallWander.y;
    spine += sin(uv.y * 11.0 - flowTime * 0.11) * uFallWander.z;
    spine += (fbm(vec2(uv.y * 2.3, flowTime * 0.019)) - 0.5) * uFallTurbulence;
    float filamentDistance = abs(uv.x - spine) * aspect;
    if (uMaterialMode > 4.5 && uMaterialMode < 5.5) {
      float leftDistance = abs(uv.x - (spine - 0.13)) * aspect;
      float rightDistance = abs(uv.x - (spine + 0.13)) * aspect;
      filamentDistance = min(leftDistance, rightDistance);
    }
    float filament = 1.0 - smoothstep(
      uBackgroundFilamentWidth.x,
      uBackgroundFilamentWidth.y,
      filamentDistance
    );
    filament *= smoothstep(localFront - 0.015, localFront + 0.055, uv.y);
    filament *= 1.0 - smoothstep(0.97, 1.08, uv.y);
    float fallSpan = max(uFallSpawnHeight - localFront, 0.08);
    float normalizedFall = clamp((uFallSpawnHeight - uv.y) / fallSpan, 0.0, 1.0);
    float filamentTravel = pow(normalizedFall, 1.0 / uFallTravelExponent);
    float filamentEmissionTime = time - filamentTravel * uBackgroundFallDuration;
    filament *= emissionStrength(filamentEmissionTime);
    filament *= 1.0 - smoothstep(0.0, 0.14, flushProgress);
    if (uMaterialMode > 1.5 && uMaterialMode < 2.5) filament = 0.0;
    if (uMaterialMode > 3.5 && uMaterialMode < 4.5) filament = 0.0;
    if (uMaterialMode > 5.5) filament = 0.0;
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
  uniform float uFlushProgress;
  uniform float uInteractiveAutomaticEmission;
  uniform float uPixelRatio;
  uniform float uLayer;
  uniform float uMaterialMode;
  uniform vec3 uBoundaryWaves;
  uniform vec3 uReservoirBoundary;
  uniform float uFlowSpeed;
  uniform vec3 uReservoirFlow;
  uniform vec2 uFallDuration;
  uniform float uFallTravelExponent;
  uniform float uFallSpawnHeight;
  uniform float uFallLaneCenter;
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
    if (uLayer > 1.5 && aDropActive < 0.5) {
      vAlpha = 0.0;
      vTone = 0.0;
      vLayer = uLayer;
      vStretch = 1.0;
      vSoftness = 1.0;
      gl_PointSize = 0.0;
      gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
      return;
    }

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

      vec2 drainCenter = vec2(0.5, -0.08);
      vec2 drainVector =
        (particlePosition - drainCenter) * vec2(aspect, 1.0);
      float drainRadius = length(drainVector);
      float vortexProgress = pow(drainProgress, 0.58);
      float drainCore = 1.0 - smoothstep(0.08, 1.08, drainRadius);
      float drainAngle = -vortexProgress * (0.86 + drainCore * 3.9);
      mat2 drainRotation = mat2(
        cos(drainAngle),
        -sin(drainAngle),
        sin(drainAngle),
        cos(drainAngle)
      );
      float drainContraction = mix(1.0, 0.12, vortexProgress);
      particlePosition = drainCenter +
        drainRotation * drainVector * drainContraction / vec2(aspect, 1.0);

      float inside = 1.0 - smoothstep(localFront - 0.018, localFront, baseY);
      float edge = exp(-abs(baseY - localFront) * 5.5);
      vAlpha = inside * mix(uReservoirAlpha.x, uReservoirAlpha.y, aSeed.w) * (0.78 + edge * 0.28);
      vAlpha *= 1.0 - smoothstep(0.86, 1.0, drainProgress);
      pointSize = mix(uReservoirPointSize.x, uReservoirPointSize.y, aSeed.w) * (0.88 + edge * 0.24);
      pointSize *= mix(1.0, 0.58, drainProgress);
      vStretch = mix(uReservoirStretch.x, uReservoirStretch.y, aSeed.z);
      vSoftness = mix(uReservoirSoftness.x, uReservoirSoftness.y, aSeed.w);
    } else if (uLayer < 1.5) {
      float fallDuration = mix(uFallDuration.x, uFallDuration.y, aSeed.z);
      bool followsHeldAutomaticStream = uInteractiveAutomaticEmission > 0.5;
      float localDropAge = uInteractionTime - aDropStartedAt;
      float travel = followsHeldAutomaticStream
        ? fract(aSeed.y + max(localDropAge, 0.0) / fallDuration)
        : fract(aSeed.y + time / fallDuration);
      float emissionTime = time - travel * fallDuration;
      float emission = followsHeldAutomaticStream
        ? aDropActive * step(0.0, localDropAge)
        : emissionStrength(emissionTime);
      float easedTravel = pow(travel, uFallTravelExponent);
      vec2 heldOrigin = mix(aDropPreviousOrigin, aDropOrigin, aSeed.x);
      float target = followsHeldAutomaticStream
        ? min(front, heldOrigin.y - 0.025)
        : min(front, 0.99);
      float spawnY = followsHeldAutomaticStream ? heldOrigin.y : uFallSpawnHeight;
      float particleY = mix(spawnY, target, easedTravel);
      float spine = (followsHeldAutomaticStream ? heldOrigin.x : uFallLaneCenter);
      spine += sin(flowTime * 0.052) * uFallWander.x;
      spine += sin(particleY * 4.6 + flowTime * 0.2) * uFallWander.y;
      spine += sin(particleY * 11.0 - flowTime * 0.11) * uFallWander.z;
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
        particlePosition.x = fract(aSeed.x + mistDrift);
        particlePosition.y += (aSeed.w - 0.5) * 0.045;
      }
      if (uMaterialMode > 4.5 && uMaterialMode < 5.5) {
        float side = step(0.5, aSeed.x) * 2.0 - 1.0;
        float localSeed = fract(aSeed.x * 2.0);
        float burstLane = (localSeed - 0.5) * filamentWidth * 2.2;
        float spray = sin(travel * 18.0 + aSeed.z * 11.0) * 0.012;
        particlePosition.x = spine + side * 0.13;
        particlePosition.x += (burstLane + spray) / aspect;
        particlePosition.y += (aSeed.w - 0.5) * 0.035;
      }
      if (uMaterialMode > 6.5 && uMaterialMode < 7.5) {
        float segment = floor(aSeed.x * 5.0) - 2.0;
        float angle = aSeed.z * 6.283 + segment * 0.9;
        float radius = sqrt(aSeed.w) * 0.052;
        float lobeWander = sin(travel * 8.0 + segment * 1.7) * 0.013;
        particlePosition = vec2(
          spine + (sin(segment * 1.23) * 0.024 + cos(angle) * radius) / aspect,
          particleY + segment * 0.072 + sin(angle) * radius * 1.24 + lobeWander
        );
      }
      if (uMaterialMode > 7.5) {
        float side = step(0.5, aSeed.y) * 2.0 - 1.0;
        float lobe = floor(aSeed.x * 3.0) - 1.0;
        float angle = aSeed.z * 6.283 + lobe * 1.6;
        float radius = sqrt(aSeed.w) * 0.058;
        float turn = sin(travel * 7.0 + side * 1.8) * 0.012;
        particlePosition = vec2(
          spine + side * 0.155 + (lobe * 0.017 + cos(angle) * radius) / aspect,
          particleY + lobe * 0.076 + sin(angle) * radius * 1.05 + turn
        );
      }

      float endFade = pow(sin(travel * 3.14159265), 0.34);
      float veilParticle = smoothstep(uVeilThreshold, 1.0, aSeed.w);
      float coreAlpha = mix(uCoreAlpha.x, uCoreAlpha.y, aSeed.w);
      float veilAlpha = mix(uVeilAlpha.x, uVeilAlpha.y, aSeed.z);
      vAlpha = endFade * emission * mix(coreAlpha, veilAlpha, veilParticle);
      vAlpha *= 1.0 - smoothstep(0.0, 0.12, flushProgress);
      if (uMaterialMode > 1.5 && uMaterialMode < 2.5) vAlpha = 0.0;
      if (uMaterialMode > 5.5 && uMaterialMode < 6.5) vAlpha = 0.0;
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
    } else {
      float fallDuration = mix(uFallDuration.x, uFallDuration.y, aSeed.z);
      float localDropAge = uInteractionTime - aDropStartedAt;
      float travel;
      float emission;
      if (uLayer > 2.5) {
        travel = fract(aSeed.y + max(localDropAge, 0.0) / fallDuration);
        emission = aDropActive * step(0.0, localDropAge);
      } else {
        travel = clamp(localDropAge / fallDuration, 0.0, 1.0);
        emission = aDropActive * step(0.0, localDropAge);
        emission *= 1.0 - step(fallDuration, localDropAge);
      }
      float easedTravel = pow(travel, uFallTravelExponent);
      vec2 spawnOrigin = mix(aDropPreviousOrigin, aDropOrigin, aSeed.x);
      float spawnY = spawnOrigin.y;
      float target = min(front, spawnY - 0.025);
      float particleY = mix(spawnY, target, easedTravel);
      float tracePathAmount = mix(travel, 1.0, step(2.5, uLayer));
      float spine = spawnOrigin.x + sin(flowTime * 0.052) * uFallWander.x * tracePathAmount;
      spine += sin(particleY * 4.6 + flowTime * 0.2) * uFallWander.y * tracePathAmount;
      spine += sin(particleY * 11.0 - flowTime * 0.11) * uFallWander.z * tracePathAmount;
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
      if (uMaterialMode > 4.5 && uMaterialMode < 5.5) {
        float side = step(0.5, aSeed.x) * 2.0 - 1.0;
        float localSeed = fract(aSeed.x * 2.0);
        float burstLane = (localSeed - 0.5) * filamentWidth * 2.2;
        float spray = sin(travel * 18.0 + aSeed.z * 11.0) * 0.012;
        particlePosition.x = spine + side * 0.13;
        particlePosition.x += (burstLane + spray) / aspect;
        particlePosition.y += (aSeed.w - 0.5) * 0.035;
      }
      if (uMaterialMode > 6.5 && uMaterialMode < 7.5) {
        float segment = floor(aSeed.x * 5.0) - 2.0;
        float angle = aSeed.z * 6.283 + segment * 0.9;
        float radius = sqrt(aSeed.w) * 0.052;
        float lobeWander = sin(travel * 8.0 + segment * 1.7) * 0.013;
        particlePosition = vec2(
          spine + (sin(segment * 1.23) * 0.024 + cos(angle) * radius) / aspect,
          particleY + segment * 0.072 + sin(angle) * radius * 1.24 + lobeWander
        );
      }
      if (uMaterialMode > 7.5) {
        float side = step(0.5, aSeed.y) * 2.0 - 1.0;
        float lobe = floor(aSeed.x * 3.0) - 1.0;
        float angle = aSeed.z * 6.283 + lobe * 1.6;
        float radius = sqrt(aSeed.w) * 0.058;
        float turn = sin(travel * 7.0 + side * 1.8) * 0.012;
        particlePosition = vec2(
          spine + side * 0.155 + (lobe * 0.017 + cos(angle) * radius) / aspect,
          particleY + lobe * 0.076 + sin(angle) * radius * 1.05 + turn
        );
      }

      float endFade = pow(sin(travel * 3.14159265), 0.34);
      float veilParticle = smoothstep(uVeilThreshold, 1.0, aSeed.w);
      float coreAlpha = mix(uCoreAlpha.x, uCoreAlpha.y, aSeed.w);
      float veilAlpha = mix(uVeilAlpha.x, uVeilAlpha.y, aSeed.z);
      vAlpha = endFade * emission * mix(coreAlpha, veilAlpha, veilParticle);
      vAlpha *= aDropVisualStrength;
      vAlpha *= 1.0 - smoothstep(0.0, 0.12, flushProgress);
      if (uMaterialMode > 1.5 && uMaterialMode < 2.5) vAlpha = 0.0;
      if (uMaterialMode > 5.5 && uMaterialMode < 6.5) vAlpha = 0.0;
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
  uniform float uFlushProgress;
  uniform vec2 uFallDuration;
  uniform float uFallTravelExponent;
  uniform float uFallSpawnHeight;
  uniform float uFallLaneCenter;
  uniform vec3 uFallWander;
  uniform vec2 uSolidSize;
  uniform vec2 uSolidAspect;
  uniform float uSolidHorizontalSpread;
  uniform float uSolidRotation;
  uniform float uAutomaticEmission;
  uniform float uInteractiveAutomaticEmission;
  uniform float uHoldTrace;
  uniform float uMaterialMode;

  ${sharedAccumulationShader}

  varying vec2 vSolidUv;
  varying float vSolidAlpha;
  varying vec2 vSolidSeed;

  void main() {
    if (uAutomaticEmission < 0.5 && aDropActive < 0.5) {
      vSolidUv = vec2(0.0);
      vSolidAlpha = 0.0;
      vSolidSeed = vec2(0.0);
      gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
      return;
    }

    float time = uTime * uMotion;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float fallDuration = mix(uFallDuration.x, uFallDuration.y, aSeed.z);
    float front = risingHeight(uProgress);
    float travel;
    float emission;
    float target;
    float centerY;
    float centerX;

    if (uAutomaticEmission > 0.5) {
      travel = fract(aSeed.y + time / fallDuration);
      float emissionTime = time - travel * fallDuration;
      emission = emissionStrength(emissionTime);
      target = min(front, 0.99);
      float easedTravel = pow(travel, uFallTravelExponent);
      centerY = mix(uFallSpawnHeight, target, easedTravel);
      float lane = (aSeed.x - 0.5) * uSolidHorizontalSpread;
      float slowWander = sin(time * 0.052 + aSeed.z * 5.7) * uFallWander.x;
      centerX = uFallLaneCenter + lane + slowWander;
    } else {
      float localDropAge = uInteractionTime - aDropStartedAt;
      if (uInteractiveAutomaticEmission > 0.5) {
        travel = fract(aSeed.y + max(localDropAge, 0.0) / fallDuration);
        emission = aDropActive * step(0.0, localDropAge);
      } else if (uHoldTrace > 0.5) {
        travel = fract(aSeed.y + max(localDropAge, 0.0) / fallDuration);
        emission = aDropActive * step(0.0, localDropAge);
      } else {
        travel = clamp(localDropAge / fallDuration, 0.0, 1.0);
        emission = aDropActive * step(0.0, localDropAge);
        emission *= 1.0 - step(fallDuration, localDropAge);
      }
      vec2 spawnOrigin = mix(aDropPreviousOrigin, aDropOrigin, aSeed.x);
      target = min(front, spawnOrigin.y - 0.025);
      float easedTravel = pow(travel, uFallTravelExponent);
      centerY = mix(spawnOrigin.y, target, easedTravel);
      if (uInteractiveAutomaticEmission > 0.5) {
        float lane = (aSeed.x - 0.5) * uSolidHorizontalSpread;
        float slowWander = sin(time * 0.052 + aSeed.z * 5.7) * uFallWander.x;
        centerX = spawnOrigin.x + lane + slowWander;
      } else {
        float tracePathAmount = mix(travel, 1.0, step(0.5, uHoldTrace));
        float slowWander = sin(time * 0.052 + aSeed.z * 5.7) * uFallWander.x * tracePathAmount;
        centerX = spawnOrigin.x + slowWander;
      }
    }

    float size = mix(uSolidSize.x, uSolidSize.y, aSeed.w);
    float solidAspect = mix(uSolidAspect.x, uSolidAspect.y, aSeed.z);
    if (uMaterialMode > 5.5 && uMaterialMode < 6.5) {
      size *= 0.9 + aSeed.x * 0.16;
    }
    float angle = (aSeed.w - 0.5) * 2.0 * uSolidRotation;
    angle += sin(time * 0.17 + aSeed.x * 8.0) * uSolidRotation * 0.22;
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 local = rotation * position.xy;
    local *= vec2(size * solidAspect / aspect, size);

    float arrivalFade = smoothstep(0.0, 0.075, centerY - target);
    float travelFade = pow(max(sin(travel * 3.14159265), 0.0), 0.22);
    float visualStrength = mix(aDropVisualStrength, 1.0, step(0.5, uAutomaticEmission));
    vSolidAlpha = emission * arrivalFade * travelFade * visualStrength;
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
  uniform float uMaterialMode;

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

    float signedDistance;
    float across;
    if (uMaterialMode > 5.5 && uMaterialMode < 6.5) {
      float pelletRadius = mix(0.68, 0.82, vSolidSeed.y);
      signedDistance = length(vec2(localX * 1.06, vertical * 0.94)) - pelletRadius;
      across = clamp(localX / pelletRadius, -1.0, 1.0);
    } else {
      float taper = sqrt(max(0.0, 1.0 - vertical * vertical));
      float contourNoise = sin(vertical * 13.0 + vSolidSeed.y * 17.0);
      contourNoise += sin(vertical * 29.0 - vSolidSeed.x * 11.0) * 0.45;
      float width = taper * (0.72 + (vSolidSeed.y - 0.5) * 0.12);
      width *= 1.0 + contourNoise * uSolidRoughness;
      float sideDistance = abs(localX) - width;
      float endDistance = abs(vertical) - 0.965;
      signedDistance = max(sideDistance, endDistance);
      across = clamp(localX / max(width, 0.04), -1.0, 1.0);
    }
    float edge = 1.0 - smoothstep(-0.025, 0.025, signedDistance);
    if (edge <= 0.001 || vSolidAlpha <= 0.001) discard;

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
