"use client";

import { useEffect, useRef, useState, type AnimationEvent, type CSSProperties, type PointerEvent } from "react";
import styles from "./grid.module.css";

const GRID_SIZE = 5;
const MIN_PULSE_SCALE = 1.5;
const MAX_PULSE_SCALE = 4;
const advertisements = [
  ["M/3", "BARRIER CREAM", ["장벽을 생각한다면", "세라마이드 하나만으로", "끝내면 안 됩니다."], "CERAMIDE NP · CHOLESTEROL · LINOLEIC ACID", "50 mL / 1.69 FL.OZ."],
  ["VELUNE", "DEW VEIL", ["수분이 닿는 순간보다", "그 다음이 더 오래", "촉촉해야 합니다."], "HYALURONIC ACID · BETAINE · TREHALOSE", "45 mL / 1.52 FL.OZ."],
  ["ONAE", "QUIET CREAM", ["예민해진 날에는", "피부가 먼저 알아보는", "조용한 보습을."], "MADECASSOSIDE · PANTHENOL · ALLANTOIN", "60 mL / 2.02 FL.OZ."],
  ["VIRID", "MELT BALM", ["녹아드는 결만 남기고", "무거운 감각은", "남기지 않습니다."], "SQUALANE · SHEA BUTTER · JOJOBA ESTERS", "50 mL / 1.69 FL.OZ."],
  ["EON", "SOFT CLOUD GEL", ["얇게 발라도", "피부의 빈틈까지", "채워지는 보습."], "ECTOIN · BETA-GLUCAN · DIPOTASSIUM GLYCYRRHIZATE", "55 mL / 1.86 FL.OZ."],
  ["NOVI", "EVEN TONE CREAM", ["오늘의 피부 톤은", "내일의 결까지", "생각해야 합니다."], "NIACINAMIDE · N-ACETYL GLUCOSAMINE · TRANEXAMIC ACID", "40 mL / 1.35 FL.OZ."],
  ["OPAL", "DAY VEIL", ["빛 아래의 피부도", "편안하게 머무를", "하루의 한 겹."], "3-O-ETHYL ASCORBIC ACID · FERULIC ACID · TOCOPHEROL", "50 mL / 1.69 FL.OZ."],
  ["HUSH", "LEAF LOTION", ["열 오른 피부에", "필요한 건 더 많은 말보다", "가벼운 진정입니다."], "GREEN TEA LEAF EXTRACT · ARTEMISIA ANNUA EXTRACT · SCUTELLARIA ROOT EXTRACT", "70 mL / 2.36 FL.OZ."],
  ["MORI", "WATER CREAM", ["물처럼 스며들고", "오래도록 결에", "남아 있습니다."], "ALOE LEAF JUICE · CUCUMBER FRUIT EXTRACT · PRICKLY PEAR EXTRACT", "55 mL / 1.86 FL.OZ."],
  ["HABIT", "GRAIN BALM", ["거친 날의 피부에", "부드러운 결을", "다시 더합니다."], "OAT KERNEL FLOUR · RICE BRAN OIL · BARLEY EXTRACT", "45 mL / 1.52 FL.OZ."],
  ["NOLL", "CLEAR CREAM", ["복잡해진 피부엔", "단순하고 맑은", "휴식이 필요합니다."], "HOUTTUYNIA EXTRACT · CALENDULA FLOWER EXTRACT · CHAMOMILE FLOWER WATER", "50 mL / 1.69 FL.OZ."],
  ["PHAZE", "SMOOTH FLUID", ["매끈한 결은", "서두르지 않을 때", "더 또렷해집니다."], "GLUCONOLACTONE · CAPRYLOYL SALICYLIC ACID · LACTOBIONIC ACID", "35 mL / 1.18 FL.OZ."],
  ["NIDO", "NMF CREAM", ["피부가 당기는 순간", "잃어버린 수분의 자리를", "다시 채웁니다."], "UREA · SODIUM PCA · SODIUM LACTATE", "60 mL / 2.02 FL.OZ."],
  ["LUME", "JELLY CREAM", ["탄력 있는 수분감은", "피부 위에서 천천히", "빛을 만듭니다."], "TREMELLA EXTRACT · PULLULAN · SACCHARIDE ISOMERATE", "50 mL / 1.69 FL.OZ."],
  ["FERME", "BIOME CREAM", ["매일의 피부에는", "익숙한 균형을", "되찾는 시간이 필요합니다."], "BIFIDA FERMENT LYSATE · LACTOBACILLUS FERMENT · GALACTOMYCES FILTRATE", "50 mL / 1.69 FL.OZ."],
  ["ARC", "FIRM CREAM", ["피부의 다음 장면까지", "생각하는 한 겹을", "바릅니다."], "COPPER TRIPEPTIDE-1 · PALMITOYL TRIPEPTIDE-1 · ACETYL HEXAPEPTIDE-8", "45 mL / 1.52 FL.OZ."],
  ["GRAIN", "RICE MILK CREAM", ["쌀 한 톨의 결처럼", "매끈하고 편안한", "촉감을 남깁니다."], "BLACK RICE EXTRACT · SOYBEAN EXTRACT · ADZUKI BEAN EXTRACT", "55 mL / 1.86 FL.OZ."],
  ["SOL", "GOLDEN OIL CREAM", ["빛나는 건 겉만이 아니라", "피부가 편안한", "순간입니다."], "SEA BUCKTHORN OIL · MEADOWFOAM SEED OIL · EVENING PRIMROSE OIL", "40 mL / 1.35 FL.OZ."],
  ["CAME", "SILK CREAM", ["부드러움에는", "오래 남는 이유가", "있습니다."], "CAMELLIA SEED OIL · MARULA SEED OIL · ARGAN KERNEL OIL", "50 mL / 1.69 FL.OZ."],
  ["MELON", "SEED CREAM", ["가벼운 한 겹이", "피부의 하루를", "달리게 합니다."], "WATERMELON SEED OIL · CRAMBE SEED OIL · BAOBAB SEED OIL", "45 mL / 1.52 FL.OZ."],
  ["LIPID", "LAYER CREAM", ["피부가 기억하는 건", "성분 하나보다", "잘 맞는 순서입니다."], "PHYTOSTEROLS · HYDROGENATED LECITHIN · CERAMIDE AP", "50 mL / 1.69 FL.OZ."],
  ["NUE", "WATER BIND CREAM", ["수분을 머금는 힘도", "피부 안에서", "천천히 길러집니다."], "POLYGLYCERYL-10 STEARATE · GLYCERYL GLUCOSIDE · SODIUM POLYGLUTAMATE", "55 mL / 1.86 FL.OZ."],
  ["BIRCH", "FOREST CREAM", ["맑은 날의 공기처럼", "피부 위에 가볍게", "앉습니다."], "BAMBOO WATER · BIRCH SAP · ICELAND MOSS EXTRACT", "60 mL / 2.02 FL.OZ."],
  ["AURA", "NIGHT OIL CREAM", ["하루가 길었던 피부에", "부드러운 향의", "쉼을 건넵니다."], "BLUE TANSY OIL · YLANG YLANG FLOWER OIL · NEROLI FLOWER OIL", "40 mL / 1.35 FL.OZ."],
  ["ROVE", "SEED RICH CREAM", ["매일 다른 피부에도", "변하지 않는 보습의", "기준을 남깁니다."], "RASPBERRY SEED OIL · POMEGRANATE SEED OIL · KALAHARI MELON OIL", "50 mL / 1.69 FL.OZ."],
] as const;
const random = (index: number, salt: number) => {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
};
const cells = advertisements.map(([brand, product, copy, ingredients, volume], index) => ({
  id: `barrier-cell-${index}`,
  brand,
  product,
  copy,
  ingredients,
  volume,
  maxPulseScale: (MIN_PULSE_SCALE + random(index, 1) * (MAX_PULSE_SCALE - MIN_PULSE_SCALE)).toFixed(3),
  pulseDuration: `${(.2 + random(index, 2) * .3).toFixed(3)}s`,
  pulseDelay: `${(-random(index, 3) * .5).toFixed(3)}s`,
}));

function BarrierCell({ cell }: { cell: (typeof cells)[number] }) {
  const [amount, setAmount] = useState(0);
  const previous = useRef<{ x: number; y: number } | null>(null);
  const timers = useRef<number[]>([]);
  const formulaVisible = amount >= 85;
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
  const updateFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!previous.current) return;
    const distance = Math.hypot(event.clientX - previous.current.x, event.clientY - previous.current.y);
    const width = event.currentTarget.clientWidth;
    previous.current = { x: event.clientX, y: event.clientY };
    setAmount((value) => Math.min(100, value + distance / Math.max(1, width / GRID_SIZE) * 95));
  };
  const scheduleNextPulse = (event: AnimationEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const interval = .2 + Math.random() * .3;
    target.style.animation = "none";
    const timer = window.setTimeout(() => {
      timers.current = timers.current.filter((id) => id !== timer);
      target.style.setProperty("--pulse-scale", target.style.getPropertyValue("--max-pulse-scale"));
      target.style.setProperty("--pulse-duration", `${(.2 + Math.random() * .3).toFixed(3)}s`);
      target.style.setProperty("--pulse-delay", "0s");
      void target.offsetWidth;
      target.style.removeProperty("animation");
    }, interval * 1000);
    timers.current.push(timer);
  };
  return (
    <article className={styles.cell} style={{ "--progress": amount / 100 } as CSSProperties}>
      <div className={styles.ad}>
        <div className={styles.productPulse} style={{ "--max-pulse-scale": cell.maxPulseScale, "--pulse-scale": cell.maxPulseScale, "--pulse-duration": cell.pulseDuration, "--pulse-delay": cell.pulseDelay } as CSSProperties} aria-hidden="true" onAnimationEnd={scheduleNextPulse}>
          <div className={styles.productImage} />
        </div>
        <div className={styles.surface} aria-hidden="true" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); previous.current = { x: event.clientX, y: event.clientY }; }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event); }} onPointerUp={() => { previous.current = null; }} onPointerCancel={() => { previous.current = null; }} onLostPointerCapture={() => { previous.current = null; }} />
        <div className={styles.productLabel} aria-hidden="true"><strong>{cell.brand}</strong><span>{cell.product}</span><small>{cell.ingredients}<br />{cell.volume}</small></div>
        <h2 className={styles.copy}><span>{cell.copy[0]}</span><span>{cell.copy[1]}</span><span>{cell.copy[2]}</span></h2>
        <p className={styles.formula} data-visible={formulaVisible}>{cell.ingredients}</p>
        <input className={styles.range} type="range" min="0" max="100" value={Math.round(amount)} aria-label={`${cell.id} 크림을 펴 바르는 정도`} onChange={(event) => setAmount(Number(event.target.value))} />
      </div>
    </article>
  );
}

export default function BarrierGridOne() {
  return (
    <main className={styles.page} style={{ "--n": GRID_SIZE, "--scale": 1 / GRID_SIZE } as CSSProperties}>
      <div className={styles.grid}>
        {cells.map((cell) => <BarrierCell key={cell.id} cell={cell} />)}
      </div>
    </main>
  );
}
