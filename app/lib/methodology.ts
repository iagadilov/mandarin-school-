// Mandarin mental-arithmetic methodology engine.
//
// Собрано под ЭТАЛОН клиента (t.mentalnaya-arifmetika.club) и его голосовые ТЗ:
// генерация примеров ПО ФОРМУЛАМ (соробан: "маленькие друзья" = законы на 5,
// "большие друзья" = законы на 10), а не рандом-калькулятор. Ядро - симулятор
// одного разряда абакуса (косточки 0..9 + перенос): операнд выдаётся только когда
// состояние косточек реально требует выбранную формулу.
//
// Структура настроек повторяет эталон:
//   Тип задания: Законы (на 5 И на 10 одновременно) | Отработка движений | Десятки | Двузначные
//   Для законов - ДВА независимых селектора: закон на 5 и закон на 10
//   (каждый: Любой / конкретная формула / Без).
//   Плюс: разрядность чисел (1..4), количество чисел в примере (ряды 2..10),
//   количество примеров (1..50), скорость (5с..0.1с).

export type Language = "ru" | "kk";

// Селектор одного закона (как в эталоне - мультивыбор):
//  "any"     - любой (все формулы вместе)
//  "off"     - без этого закона
//  number[]  - выбранные конкретные формулы (одна или несколько)
export type LawSel = "any" | "off" | number[];

export type TaskType = "laws" | "movements" | "tens" | "double";

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
  withFormula: boolean; // для десятки/двузначные: без формул или с формулами (по требованию Перизат)
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
  laws: "Законы (Братья / Друзья)",
  movements: "Отработка движений",
  tens: "Десятки (10+30+50)",
  double: "Одинаковые двузначные (11+55+22)",
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

// Десятки С ФОРМУЛАМИ: законы работают в разряде десятков (последовательность
// законов по единичному разряду, умноженная на 10). Так 30+80 требует закон на 10
// в десятках (перенос в сотни), 30+40 - закон на 5 в десятках.
function genTensFormula(law5: LawSel, law10: LawSel, rows: number, rand: () => number): Example | null {
  for (let attempt = 0; attempt < 8; attempt++) {
    const seq = genUnitsSequence(law5, law10, rows, rand);
    if (!seq) continue;
    const operands = seq.deltas.map((d) => d * 10);
    const steps: Step[] = seq.steps.map((s) => ({ delta: s.delta * 10, kind: s.kind, running: s.running * 10 }));
    const total = operands.reduce((a, b) => a + b, 0);
    return finalize(operands, steps, total);
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

function fallback(rows: number): Example {
  const pattern = [4, 5, -8, 1, 7, -5, 3, -4, 6, -9];
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
    case "laws":
      ex = genLaws(s.law5, s.law10, digits, rows, rand);
      break;
    case "movements":
      ex = genMovements(digits, rows, rand);
      break;
    case "tens":
      // с формулами - законы в разряде десятков; без формул - 10+30+50
      ex = s.withFormula ? genTensFormula(s.law5, s.law10, rows, rand) : genTens(rows, rand);
      break;
    case "double":
      // с формулами - двузначные с законами (единичный разряд по методике); без формул - 11+55+22
      ex = s.withFormula ? genLaws(s.law5, s.law10, 2, rows, rand) : genDouble(rows, rand);
      break;
  }
  return ex ?? fallback(rows);
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
// Дерево методики: уровень -> урок. Пресеты настроек под уроки уровня 1
// (по полученным книгам). Старшие уровни - каркас под методиста центра.
// ---------------------------------------------------------------------------

export type LessonPreset = Partial<Pick<Settings, "taskType" | "law5" | "law10" | "digits" | "rows" | "withFormula">>;
export type Lesson = { id: string; name: string; note: string; preset: LessonPreset };
export type Level = { id: string; name: string; book: string; ready: boolean; lessons: Lesson[] };

// Структура выведена из анализа книг клиента (Kids/Junior/Teen 1-7):
// разрядность и операции по факту растут Kids -> Teen7, умножение/деление
// появляются с Teen 4. Порядок законов - стандартная прогрессия соробана
// (движения -> братья -> друзья -> товарищи), точную привязку к урокам
// подтверждает методист центра.
export const LEVELS: Level[] = [
  {
    id: "1",
    name: "1 деңгей",
    book: "Kids / Kids2 / Junior-1 / Teen 1",
    ready: true,
    lessons: [
      { id: "1-1", name: "Kids: единицы без формул", note: "Прямые ходы в единицах 1..9: без обмена через 5/10; например 4+5-8+1.", preset: { taskType: "movements", digits: 1, rows: 4 } },
      { id: "1-2", name: "Kids: законы на 5", note: "Законы на 5 (братья): +1..+4 и -1..-4.", preset: { taskType: "laws", law5: "any", law10: "off", digits: 1, rows: 4 } },
      { id: "1-3", name: "Junior: законы на 10", note: "Законы на 10 (друзья): +1..+9.", preset: { taskType: "laws", law5: "off", law10: "any", digits: 1, rows: 5 } },
      { id: "1-4", name: "Teen 1: товарищи", note: "Братья и друзья вместе (товарищи).", preset: { taskType: "laws", law5: "any", law10: "any", digits: 1, rows: 6 } },
      { id: "1-5", name: "Teen 1: десятки/двузначные", note: "Десятки и одинаковые двузначные строятся от той же логики прямых ходов 1..9.", preset: { taskType: "tens", digits: 2, rows: 4, withFormula: false } },
    ],
  },
  {
    id: "2",
    name: "2 деңгей",
    book: "Teen 2",
    ready: true,
    lessons: [
      { id: "2-1", name: "Урок 1", note: "Все законы вместе, разрядность 2 (по книге Teen 2).", preset: { taskType: "laws", law5: "any", law10: "any", digits: 2, rows: 6 } },
      { id: "2-2", name: "Урок 2", note: "Разрядность 3, законы в старших разрядах.", preset: { taskType: "laws", law5: "any", law10: "any", digits: 3, rows: 6 } },
      { id: "2-3", name: "Урок 3", note: "Десятки с формулами (законы в разряде десятков).", preset: { taskType: "tens", digits: 2, rows: 5, withFormula: true, law5: "any", law10: "any" } },
    ],
  },
  {
    id: "3",
    name: "3 деңгей",
    book: "Teen 3",
    ready: true,
    lessons: [
      { id: "3-1", name: "Урок 1", note: "Разрядность 3, все законы (по книге Teen 3).", preset: { taskType: "laws", law5: "any", law10: "any", digits: 3, rows: 7 } },
      { id: "3-2", name: "Урок 2", note: "Двузначные с формулами, разрядность 2.", preset: { taskType: "double", digits: 2, rows: 5, withFormula: true, law5: "any", law10: "any" } },
    ],
  },
  {
    id: "teen",
    name: "Teen 4-7",
    book: "Teen 4 / 5 / 6 / 7",
    ready: false,
    lessons: [
      { id: "teen-1", name: "Teen 4", note: "Разрядность 3. С Teen 4 в книгах вводятся умножение и деление (в тренажёре 1 этапа - сложение/вычитание).", preset: { taskType: "laws", law5: "any", law10: "any", digits: 3, rows: 8 } },
      { id: "teen-2", name: "Teen 5-6", note: "Разрядность 4, умножение и деление (модуль умножения/деления - следующий этап).", preset: { taskType: "laws", law5: "any", law10: "any", digits: 4, rows: 8 } },
      { id: "teen-3", name: "Teen 7", note: "Разрядность 3-4, скоростной счёт, умножение/деление.", preset: { taskType: "laws", law5: "any", law10: "any", digits: 4, rows: 9 } },
    ],
  },
];

export function findLevel(id: string): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

export function findLesson(level: Level, id: string): Lesson {
  return level.lessons.find((l) => l.id === id) ?? level.lessons[0];
}
