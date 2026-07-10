// Mandarin Stage 1 methodology engine.
//
// The core rule is not only mathematical correctness. Every next operand must
// also be valid as an abacus move for the selected methodology block.

export type Language = "ru" | "kk";

// Селектор одного закона (как в эталоне - мультивыбор):
//  "any"     - любой (все формулы вместе)
//  "off"     - без этого закона
//  number[]  - выбранные конкретные формулы (одна или несколько)
export type LawSel = "any" | "off" | number[];

export type TaskType =
  | "movements"
  | "tens"
  | "double"
  | "doubleMixed"
  | "triple"
  | "tripleSame"
  | "formula5"
  | "formula10"
  | "doubleSameFormula5"
  | "doubleMixedFormula5"
  | "doubleMixedFormula10"
  | "tripleSameFormula5";

export type Settings = {
  levelId: string;
  lessonId: string;
  taskType: TaskType;
  law5: LawSel; // закон на 5: any | off | [deltas]
  law10: LawSel; // закон на 10: any | off | [deltas]
  digits: number; // разрядность чисел, 1..4
  rows: number; // чисел в примере (рядов), 2..10
  examples: number; // примеров в серии, 1..50
  speed: number; // секунд на число, 5..0.1
  withFormula: boolean; // legacy field kept for stable settings hashing; visible UI uses separate formula blocks
  language: Language;
  speak: boolean;
};

export type Step = {
  delta: number; // что видит и складывает ребёнок (единичный разряд)
  kind: "direct" | "five" | "ten" | "ten5";
  running: number;
};

export type Example = {
  id: number;
  operands: number[]; // ряды примера (могут быть многозначными)
  answer: number;
  steps: Step[]; // шаги по разряду единиц (методика)
  fiveHits: number;
  tenHits: number;
};

// ---------------------------------------------------------------------------
// Формулы (методика). Метка = что складывает ребёнок, механика = как на абакусе.
// ---------------------------------------------------------------------------

export type Formula = { delta: number; label: string; mechanic: string };

// Законы на 5 ("маленькие друзья" / братья): переход через пятёрку внутри разряда.
export const FIVE_FORMULAS: Formula[] = [
  { delta: -4, label: "-4", mechanic: "-5 +1" },
  { delta: -3, label: "-3", mechanic: "-5 +2" },
  { delta: -2, label: "-2", mechanic: "-5 +3" },
  { delta: -1, label: "-1", mechanic: "-5 +4" },
  { delta: 1, label: "+1", mechanic: "-4 +5" },
  { delta: 2, label: "+2", mechanic: "-3 +5" },
  { delta: 3, label: "+3", mechanic: "-2 +5" },
  { delta: 4, label: "+4", mechanic: "-1 +5" },
];

// Законы на 10 ("большие друзья" / друзья): переход через десяток.
export const TEN_FORMULAS: Formula[] = [
  { delta: -9, label: "-9", mechanic: "+1 -10" },
  { delta: -8, label: "-8", mechanic: "+2 -10" },
  { delta: -7, label: "-7", mechanic: "+3 -10" },
  { delta: -6, label: "-6", mechanic: "+4 -10" },
  { delta: -5, label: "-5", mechanic: "+5 -10" },
  { delta: -4, label: "-4", mechanic: "+6 -10" },
  { delta: -3, label: "-3", mechanic: "+7 -10" },
  { delta: -2, label: "-2", mechanic: "+8 -10" },
  { delta: -1, label: "-1", mechanic: "+9 -10" },
  { delta: 1, label: "+1", mechanic: "-9 +10" },
  { delta: 2, label: "+2", mechanic: "-8 +10" },
  { delta: 3, label: "+3", mechanic: "-7 +10" },
  { delta: 4, label: "+4", mechanic: "-6 +10" },
  { delta: 5, label: "+5", mechanic: "-5 +10" },
  { delta: 6, label: "+6", mechanic: "-4 +10" },
  { delta: 7, label: "+7", mechanic: "-3 +10" },
  { delta: 8, label: "+8", mechanic: "-2 +10" },
  { delta: 9, label: "+9", mechanic: "-1 +10" },
];

export const TASK_LABELS: Record<TaskType, string> = {
  movements: "Единицы без формул",
  tens: "Десятки без формул",
  double: "Одинаковые двузначные",
  doubleMixed: "Разные двузначные",
  triple: "Трёхзначные до 999",
  tripleSame: "Одинаковые 111-999",
  formula5: "Формулы на 5",
  formula10: "Формулы на 10",
  doubleSameFormula5: "11-99 на 5",
  doubleMixedFormula5: "Разные двузначные на 5",
  doubleMixedFormula10: "Разные двузначные на 10",
  tripleSameFormula5: "111-999 на 5",
};

// ---------------------------------------------------------------------------
// Классификатор одного шага на абакусе (разряд единиц 0..9).
// ---------------------------------------------------------------------------

type StepInfo = { kind: Step["kind"]; newU: number; carry: number };

function classify(u: number, d: number): StepInfo | null {
  if (d === 0) return null;
  const lower = u % 5;
  if (d > 0) {
    if (u + d <= 9) {
      const t = (u + d) % 5;
      return { kind: t >= lower ? "direct" : "five", newU: u + d, carry: 0 };
    }
    if (d >= 10) return null;
    const newU = u + d - 10;
    return { kind: "ten", newU, carry: 1 };
  }
  const a = -d;
  if (u - a >= 0) {
    const t = (u - a) % 5;
    return { kind: t <= lower ? "direct" : "five", newU: u - a, carry: 0 };
  }
  if (a >= 10) return null;
  const newU = u - a + 10;
  return { kind: "ten", newU, carry: -1 };
}

// ---------------------------------------------------------------------------
// Детерминированный PRNG (mulberry32) - совпадение SSR и первого рендера.
// ---------------------------------------------------------------------------

export function makeRng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSettings(s: Settings, extra: number): number {
  const str = `${s.levelId}|${s.lessonId}|${s.taskType}|${s.law5}|${s.law10}|${s.digits}|${s.rows}|${s.withFormula}|${s.examples}|${extra}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length) % arr.length];
}

const MAX_ATTEMPTS = 500;

// ---------------------------------------------------------------------------
// Ядро: последовательность шагов по разряду единиц под законы 5/10.
// law5 / law10: "any" | "off" | конкретный delta.
// Возвращает список единичных дельт и их kind, либо null при тупике.
// ---------------------------------------------------------------------------

function lawAllows(sel: LawSel, d: number): boolean {
  if (sel === "off") return false;
  if (sel === "any") return true;
  return sel.includes(d); // мультивыбор: разрешены выбранные формулы
}

function genUnitsSequence(law5: LawSel, law10: LawSel, rows: number, rand: () => number): { deltas: number[]; steps: Step[] } | null {
  const tenActive = law10 !== "off";
  const fiveActive = law5 !== "off";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let u = 1 + Math.floor(rand() * (tenActive ? 7 : 4)); // старт 1..4 или 1..8
    const deltas = [u];
    const steps: Step[] = [{ delta: u, kind: "direct", running: u }];
    let five = 0;
    let ten = 0;
    let ok = true;
    let total = u;

    for (let i = 1; i < rows; i++) {
      const formulaCands: number[] = [];
      const fillCands: number[] = [];
      for (let d = -9; d <= 9; d++) {
        if (d === 0) continue;
        const info = classify(u, d);
        if (!info) continue;
        if (info.carry !== 0 && !tenActive) continue; // без законов на 10 - без переносов
        if (info.newU < 0 || info.newU > 9) continue;
        if (total + d < 0) continue;
        if (info.kind === "direct") {
          fillCands.push(d);
        } else if (info.kind === "five") {
          if (lawAllows(law5, d)) formulaCands.push(d);
        } else if (info.kind === "ten") {
          if (lawAllows(law10, d)) formulaCands.push(d);
        }
      }
      const needMore = (fiveActive && five === 0) || (tenActive && ten === 0);
      const wantFormula = formulaCands.length && (rand() < 0.72 || (i === rows - 1 && needMore));
      let d: number | null = null;
      if (wantFormula) d = pick(formulaCands, rand);
      else if (fillCands.length) d = pick(fillCands, rand);
      else if (formulaCands.length) d = pick(formulaCands, rand);
      if (d === null) {
        ok = false;
        break;
      }
      const info = classify(u, d)!;
      u = info.newU;
      total += d;
      deltas.push(d);
      steps.push({ delta: d, kind: info.kind, running: total });
      if (info.kind === "five") five++;
      if (info.kind === "ten" || info.kind === "ten5") ten++;
    }

    const fiveOk = !fiveActive || five > 0;
    const tenOk = !tenActive || ten > 0;
    if (ok && fiveOk && tenOk) return { deltas, steps };
  }
  return null;
}

// Разложить единичные дельты в многозначные операнды (разрядность digits).
// Знак операнда = знак единичной дельты; старшие разряды добавляются в ту же
// сторону. Разряд единиц строго следует методике (законам). Для digits=1 -
// это ровно рабочие листы уровня 1 из книг (столбик знаковых однозначных).
function expandDigits(deltas: number[], digits: number, rand: () => number): { operands: number[]; total: number } | null {
  if (digits <= 1) {
    let total = 0;
    const operands = deltas.map((d) => d);
    operands.forEach((d) => (total += d));
    return total >= 0 ? { operands, total } : null;
  }
  for (let attempt = 0; attempt < 60; attempt++) {
    const operands: number[] = [];
    let total = 0;
    let ok = true;
    for (let i = 0; i < deltas.length; i++) {
      const d = deltas[i];
      const sign = d >= 0 ? 1 : -1;
      let higher = 0;
      for (let j = 1; j < digits; j++) {
        const top = i === 0 && j === digits - 1 ? 1 + Math.floor(rand() * 9) : Math.floor(rand() * 10);
        higher += top * Math.pow(10, j);
      }
      const operand = sign * (Math.abs(d) + higher);
      operands.push(operand);
      total += operand;
      if (total < 0) {
        ok = false;
        break;
      }
    }
    if (ok) return { operands, total };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Генераторы по типам задания.
// ---------------------------------------------------------------------------

function finalize(operands: number[], steps: Step[], total: number): Example {
  let five = 0;
  let ten = 0;
  for (const s of steps) {
    if (s.kind === "five") five++;
    if (s.kind === "ten" || s.kind === "ten5") ten++;
  }
  return { id: 0, operands, answer: total, steps, fiveHits: five, tenHits: ten };
}

function genLaws(law5: LawSel, law10: LawSel, digits: number, rows: number, rand: () => number): Example | null {
  // если оба закона выключены - это отработка движений
  if (law5 === "off" && law10 === "off") return genMovements(digits, rows, rand);
  for (let attempt = 0; attempt < 8; attempt++) {
    const seq = genUnitsSequence(law5, law10, rows, rand);
    if (!seq) continue;
    const exp = expandDigits(seq.deltas, digits, rand);
    if (!exp) continue;
    return finalize(exp.operands, seq.steps, exp.total);
  }
  return null;
}

// Отработка движений (единицы без формул): прямые ходы 0..9 без обмена.
// После проверки первого слоя 0..4 Перизат попросила расширить до 1..9:
// 4+5-8+1 допустимо, потому что верхняя косточка 5 добавляется/убирается
// напрямую; 4+1, 3+2, 5-1 всё ещё формулы и сюда не попадают.
function genMovements(digits: number, rows: number, rand: () => number): Example | null {
  if (digits !== 1) return null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let u = 1 + Math.floor(rand() * 9);
    const deltas = [u];
    const steps: Step[] = [{ delta: u, kind: "direct", running: u }];
    let ok = true;
    let total = u;
    for (let i = 1; i < rows; i++) {
      const cands: number[] = [];
      for (let d = -9; d <= 9; d++) {
        if (d === 0) continue;
        const info = classify(u, d);
        if (info && info.kind === "direct" && info.carry === 0 && info.newU >= 0 && info.newU <= 9 && total + d >= 0 && total + d <= 9) cands.push(d);
      }
      if (!cands.length) {
        ok = false;
        break;
      }
      const d = pick(cands, rand);
      u += d;
      total += d;
      deltas.push(d);
      steps.push({ delta: d, kind: "direct", running: total });
    }
    if (!ok) continue;
    const exp = expandDigits(deltas, digits, rand);
    if (!exp) continue;
    return finalize(exp.operands, steps, exp.total);
  }
  return null;
}

// Блоки "одинаковые ... на 5" тренируют именно формулы ±5:
// после первого ряда каждый следующий ход должен быть формулой на 5, без ±10.
function genUnitsFiveOnly(rows: number, rand: () => number): Example | null {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let u = 5 + Math.floor(rand() * 5);
    const deltas = [u];
    const steps: Step[] = [{ delta: u, kind: "direct", running: u }];
    let total = u;
    let ok = true;

    for (let i = 1; i < rows; i++) {
      const cands: number[] = [];
      for (let d = -4; d <= 4; d++) {
        if (d === 0) continue;
        const info = classify(u, d);
        if (info && info.kind === "five" && info.carry === 0 && total + d >= 0 && total + d <= 9) cands.push(d);
      }
      if (!cands.length) {
        ok = false;
        break;
      }
      const d = pick(cands, rand);
      const info = classify(u, d)!;
      u = info.newU;
      total += d;
      deltas.push(d);
      steps.push({ delta: d, kind: "five", running: total });
    }

    if (ok) return finalize(deltas, steps, total);
  }
  return null;
}

function scaleExample(ex: Example, factor: number): Example {
  const operands = ex.operands.map((n) => n * factor);
  const steps = ex.steps.map((s) => ({ ...s, delta: s.delta * factor, running: s.running * factor }));
  return finalize(operands, steps, ex.answer * factor);
}

// Десятки без формул: та же подтверждаемая логика прямых ходов 1..9, но x10.
function genTens(rows: number, rand: () => number): Example | null {
  const base = genMovements(1, rows, rand);
  return base ? scaleExample(base, 10) : null;
}

// Одинаковые двузначные без формул: 11/22/33/.../99 как x11 от единиц 1..9.
function genDouble(rows: number, rand: () => number): Example | null {
  const base = genMovements(1, rows, rand);
  return base ? scaleExample(base, 11) : null;
}

function digitsToNumber(digits: number[]): number {
  return digits.reduce((sum, digit) => sum * 10 + digit, 0);
}

function numberToDigits(value: number, digits: number): number[] {
  return String(Math.abs(value)).padStart(digits, "0").slice(-digits).split("").map(Number);
}

function isDirectDelta(current: number, delta: number): boolean {
  const info = classify(current, delta);
  return Boolean(info && info.kind === "direct" && info.carry === 0 && info.newU >= 0 && info.newU <= 9);
}

function hasDifferentDigits(value: number, digits: number): boolean {
  const list = numberToDigits(value, digits);
  return new Set(list).size > 1;
}

function isFullDigitNumber(value: number, digits: number): boolean {
  return Math.abs(value) >= Math.pow(10, digits - 1);
}

function randomAbsDigits(digits: number, different: boolean, rand: () => number): number[] {
  for (let attempt = 0; attempt < 100; attempt++) {
    const list = Array.from({ length: digits }, (_, index) => (index === 0 ? 1 + Math.floor(rand() * 9) : Math.floor(rand() * 10)));
    if (!different || new Set(list).size > 1) return list;
  }
  return digits === 2 ? [1, 2] : [1, 2, 3].slice(0, digits);
}

type DigitMode = "direct" | "five" | "ten";
type DigitCandidate = { operand: number; next: number[]; fiveHit: boolean; tenHit: boolean };

// Разные двузначные и другие поразрядные блоки: каждая цифра проверяется
// отдельно, без скрытого переноса между разрядами.
function genByDigits(rows: number, digits: number, mode: DigitMode, different: boolean, rand: () => number): Example | null {
  const maxTotal = Math.pow(10, digits) - 1;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const current = randomAbsDigits(digits, different, rand);
    const first = digitsToNumber(current);
    const operands = [first];
    const steps: Step[] = [{ delta: first, kind: "direct", running: first }];
    let total = first;
    let fiveHits = 0;
    let tenHits = 0;
    let ok = true;

    for (let row = 1; row < rows; row++) {
      const candidates: DigitCandidate[] = [];
      for (const sign of [1, -1]) {
        for (let sample = 0; sample < 80; sample++) {
          const absDigits = randomAbsDigits(digits, different, rand);
          let fiveHit = false;
          let tenHit = false;
          let valid = true;
          const next = [...current];

          for (let index = 0; index < digits; index++) {
            const delta = sign * absDigits[index];
            if (delta === 0) continue;
            const info = classify(current[index], delta);
            if (!info || (info.carry !== 0 && mode !== "ten")) {
              valid = false;
              break;
            }
            if (mode === "direct" && info.kind !== "direct") {
              valid = false;
              break;
            }
            if (mode === "five" && info.kind === "ten") {
              valid = false;
              break;
            }
            if (info.kind === "five") fiveHit = true;
            if (info.kind === "ten" || info.kind === "ten5") tenHit = true;
            next[index] = info.newU;
          }

          const operand = sign * digitsToNumber(absDigits);
          const nextTotal = total + operand;
          if (valid && operand !== 0 && nextTotal >= 0 && nextTotal <= maxTotal) {
            candidates.push({ operand, next, fiveHit, tenHit });
          }
        }
      }

      const needFive = mode === "five" && fiveHits === 0;
      const needTen = mode === "ten" && tenHits === 0;
      const formulaCandidates = candidates.filter((candidate) => (needFive && candidate.fiveHit) || (needTen && candidate.tenHit));
      const pool = (needFive || needTen) && formulaCandidates.length ? formulaCandidates : candidates;
      if (!pool.length) {
        ok = false;
        break;
      }

      const selected = pick(pool, rand);
      operands.push(selected.operand);
      total += selected.operand;
      current.splice(0, current.length, ...selected.next);
      if (selected.fiveHit) fiveHits++;
      if (selected.tenHit) tenHits++;
      steps.push({ delta: selected.operand, kind: selected.tenHit ? "ten" : selected.fiveHit ? "five" : "direct", running: total });
    }

    const formulaOk = mode === "direct" || (mode === "five" && fiveHits > 0) || (mode === "ten" && tenHits > 0);
    if (ok && formulaOk) return finalize(operands, steps, total);
  }
  return null;
}

function genDoubleMixed(rows: number, rand: () => number): Example | null {
  return genByDigits(rows, 2, "direct", false, rand);
}

function genDoubleMixedFormula5(rows: number, rand: () => number): Example | null {
  return genByDigits(rows, 2, "five", false, rand);
}

function genDoubleSameFormula5(rows: number, rand: () => number): Example | null {
  const base = genUnitsFiveOnly(rows, rand);
  return base ? scaleExample(base, 11) : null;
}

function genTripleSame(rows: number, rand: () => number): Example | null {
  const base = genMovements(1, rows, rand);
  return base ? scaleExample(base, 111) : null;
}

function genTripleSameFormula5(rows: number, rand: () => number): Example | null {
  const base = genLaws("any", "off", 1, rows, rand);
  return base ? scaleExample(base, 111) : null;
}

function genDoubleMixedFormula10(rows: number, rand: () => number): Example | null {
  return genByDigits(rows, 2, "ten", false, rand);
}

// Трёхзначные до 999: прямые поразрядные ходы без переносов и обменов.
// В каждом ряду знак общий для всего числа, а каждая цифра проверяется как
// отдельное движение на абакусе.
function genTriple(rows: number, rand: () => number): Example | null {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const current = [
      1 + Math.floor(rand() * 9),
      Math.floor(rand() * 10),
      Math.floor(rand() * 10),
    ];
    const operands = [digitsToNumber(current)];
    const steps: Step[] = [{ delta: operands[0], kind: "direct", running: operands[0] }];
    let total = operands[0];
    let ok = true;

    for (let row = 1; row < rows; row++) {
      const rowCandidates: number[] = [];
      for (const sign of [1, -1]) {
        const perDigit: number[][] = current.map((digit, index) => {
          const min = index === 0 ? 1 : 0;
          const result: number[] = [];
          for (let value = min; value <= 9; value++) {
            if (value === 0 && index === 0) continue;
            if (isDirectDelta(digit, sign * value)) result.push(value);
          }
          return result;
        });
        if (perDigit.every((list) => list.length > 0)) {
          for (let i = 0; i < 14; i++) {
            const digits = perDigit.map((list) => pick(list, rand));
            const operand = sign * digitsToNumber(digits);
            if (operand !== 0 && total + operand >= 0) rowCandidates.push(operand);
          }
        }
      }

      if (!rowCandidates.length) {
        ok = false;
        break;
      }
      const operand = pick(rowCandidates, rand);
      const sign = operand >= 0 ? 1 : -1;
      const absDigits = String(Math.abs(operand)).padStart(3, "0").split("").map(Number);
      absDigits.forEach((digit, index) => {
        current[index] += sign * digit;
      });
      total += operand;
      operands.push(operand);
      steps.push({ delta: operand, kind: "direct", running: total });
    }

    if (ok) return finalize(operands, steps, total);
  }
  return null;
}

function fallback(rows: number, taskType: TaskType): Example {
  const patterns: Record<TaskType, number[]> = {
    movements: [4, 5, -8, 1, 7, -5, 3, -4, 6, -9],
    tens: [40, 50, -80, 10, 70, -50, 30, -40, 60, -90],
    double: [44, 55, -88, 11, 77, -55, 33, -44, 66, -99],
    doubleMixed: [12, 36, -24, 41, -32, 53, -21, 14, 35, -42],
    triple: [438, 551, -882, 110, 327, -105, 220, -330, 101, -202],
    tripleSame: [444, 555, -888, 111, 777, -555, 333, -444, 666, -999],
    formula5: [4, 1, -5, 2, -1, 3, -4, 5, -2, 1],
    formula10: [8, 2, -1, 3, -2, 5, -6, 4, -3, 1],
    doubleSameFormula5: [44, 11, -55, 22, -11, 33, -44, 55, -22, 11],
    doubleMixedFormula5: [34, 12, -45, 23, -12, 31, -24, 42, -13, 21],
    doubleMixedFormula10: [18, 12, -21, 14, -13, 21, -24, 32, -31, 12],
    tripleSameFormula5: [444, 111, -555, 222, -111, 333, -444, 555, -222, 111],
  };
  const pattern = patterns[taskType];
  const operands = Array.from({ length: rows }, (_, i) => pattern[i % pattern.length]);
  const steps: Step[] = [];
  let total = 0;
  for (const d of operands) {
    total += d;
    steps.push({ delta: d, kind: "direct", running: total });
  }
  return finalize(operands, steps, total);
}

export function generateExample(s: Settings, rand: () => number): Example {
  const rows = Math.max(2, Math.min(10, s.rows));
  const digits = Math.max(1, Math.min(4, s.digits));
  let ex: Example | null = null;
  switch (s.taskType) {
    case "formula5":
      ex = genLaws("any", "off", 1, rows, rand);
      break;
    case "formula10":
      ex = genLaws("off", "any", 1, rows, rand);
      break;
    case "doubleSameFormula5":
      ex = genDoubleSameFormula5(rows, rand);
      break;
    case "doubleMixedFormula5":
      ex = genDoubleMixedFormula5(rows, rand);
      break;
    case "doubleMixedFormula10":
      ex = genDoubleMixedFormula10(rows, rand);
      break;
    case "tripleSameFormula5":
      ex = genTripleSameFormula5(rows, rand);
      break;
    case "movements":
      ex = genMovements(digits, rows, rand);
      break;
    case "tens":
      ex = genTens(rows, rand);
      break;
    case "double":
      ex = genDouble(rows, rand);
      break;
    case "doubleMixed":
      ex = genDoubleMixed(rows, rand);
      break;
    case "triple":
      ex = genTriple(rows, rand);
      break;
    case "tripleSame":
      ex = genTripleSame(rows, rand);
      break;
  }
  return ex ?? fallback(rows, s.taskType);
}

export function generateSession(settings: Settings, seed: number): Example[] {
  const count = Math.max(1, Math.min(50, settings.examples));
  const rand = makeRng(hashSettings(settings, seed));
  return Array.from({ length: count }, (_, i) => ({ ...generateExample(settings, rand), id: i + 1 }));
}

// Ориентировочное время серии (как в эталоне): показ чисел + буфер на ответ.
export function estimateSeconds(s: Settings): number {
  const rows = Math.max(2, Math.min(10, s.rows));
  const examples = Math.max(1, Math.min(50, s.examples));
  const show = examples * rows * s.speed;
  const answerBuffer = examples * 3.5;
  return Math.round(show + answerBuffer);
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s} сек.`;
  return `${m} мин. ${s} сек.`;
}

// ---------------------------------------------------------------------------
// Stage 1 blocks. Methodist examples are the source of truth for formulas.
// ---------------------------------------------------------------------------

export type LessonPreset = Partial<Pick<Settings, "taskType" | "law5" | "law10" | "digits" | "rows" | "withFormula">>;
export type Lesson = { id: string; name: string; note: string; preset: LessonPreset };
export type Level = { id: string; name: string; book: string; ready: boolean; lessons: Lesson[] };

export const LEVELS: Level[] = [
  {
    id: "stage-1",
    name: "1 этап",
    book: "Базовый онлайн-тренажёр",
    ready: true,
    lessons: [
      { id: "units", name: "Единицы 1-9", note: "Прямые ходы в единицах 1..9: без обмена через 5/10; например 4+5-8+1.", preset: { taskType: "movements", digits: 1, rows: 4, withFormula: false, law5: "off", law10: "off" } },
      { id: "tens", name: "Десятки 10-90", note: "Та же логика прямых ходов, перенесённая на десятки.", preset: { taskType: "tens", digits: 2, rows: 4, withFormula: false, law5: "off", law10: "off" } },
      { id: "double", name: "11-99", note: "Одинаковые двузначные числа по той же логике: 11/22/33/.../99.", preset: { taskType: "double", digits: 2, rows: 4, withFormula: false, law5: "off", law10: "off" } },
      { id: "double-mixed", name: "Разные 10-99", note: "Двузначные разные числа без формул: каждый разряд проверяется отдельно, без переноса.", preset: { taskType: "doubleMixed", digits: 2, rows: 4, withFormula: false, law5: "off", law10: "off" } },
      { id: "triple", name: "до 999", note: "Трёхзначные числа до 999: поразрядные прямые ходы без переносов.", preset: { taskType: "triple", digits: 3, rows: 4, withFormula: false, law5: "off", law10: "off" } },
      { id: "triple-same", name: "111-999", note: "Одинаковые трёхзначные числа: 111/222/333/.../999 без формул.", preset: { taskType: "tripleSame", digits: 3, rows: 4, withFormula: false, law5: "off", law10: "off" } },
      { id: "formula5", name: "Формулы на 5", note: "Отдельный блок формул на 5 по правилам и примерам методиста Mandarin.", preset: { taskType: "formula5", law5: "any", law10: "off", digits: 1, rows: 5, withFormula: true } },
      { id: "formula10", name: "Формулы на 10", note: "Отдельный блок формул на 10 по правилам и примерам методиста Mandarin.", preset: { taskType: "formula10", law5: "off", law10: "any", digits: 1, rows: 5, withFormula: true } },
      { id: "double-same-formula5", name: "11-99 на 5", note: "Одинаковые двузначные числа с формулами на 5.", preset: { taskType: "doubleSameFormula5", law5: "any", law10: "off", digits: 2, rows: 5, withFormula: true } },
      { id: "double-mixed-formula5", name: "Разные 10-99 на 5", note: "Двузначные разные числа с формулами на 5: каждый разряд проверяется отдельно.", preset: { taskType: "doubleMixedFormula5", law5: "any", law10: "off", digits: 2, rows: 5, withFormula: true } },
      { id: "double-mixed-formula10", name: "Разные 10-99 на 10", note: "Двузначные разные числа с формулами на 10.", preset: { taskType: "doubleMixedFormula10", law5: "off", law10: "any", digits: 2, rows: 5, withFormula: true } },
      { id: "triple-same-formula5", name: "111-999 на 5", note: "Одинаковые трёхзначные числа с формулами на 5.", preset: { taskType: "tripleSameFormula5", law5: "any", law10: "off", digits: 3, rows: 5, withFormula: true } },
    ],
  },
];

export function findLevel(id: string): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

export function findLesson(level: Level, id: string): Lesson {
  return level.lessons.find((l) => l.id === id) ?? level.lessons[0];
}
