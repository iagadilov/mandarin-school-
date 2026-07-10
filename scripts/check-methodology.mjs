import assert from "node:assert/strict";

function classifyDirect(current, delta) {
  if (delta === 0) return false;
  const next = current + delta;
  if (next < 0 || next > 9) return false;
  const lower = current % 5;
  const nextLower = next % 5;

  if (delta > 0) return nextLower >= lower;
  return nextLower <= lower;
}

function classifyMove(current, delta) {
  if (delta === 0) return null;
  const lower = current % 5;
  if (delta > 0) {
    if (current + delta <= 9) {
      const next = current + delta;
      const nextLower = next % 5;
      return { kind: nextLower >= lower ? "direct" : "five", next };
    }
    if (delta < 10) return { kind: "ten", next: current + delta - 10 };
    return null;
  }
  const abs = -delta;
  if (current - abs >= 0) {
    const next = current - abs;
    const nextLower = next % 5;
    return { kind: nextLower <= lower ? "direct" : "five", next };
  }
  if (abs < 10) return { kind: "ten", next: current - abs + 10 };
  return null;
}

function isDirectUnitsSequence(operands) {
  let current = 0;
  for (const delta of operands) {
    if (!classifyDirect(current, delta)) return false;
    current += delta;
  }
  return true;
}

function digitsOf(value, width) {
  return String(Math.abs(value)).padStart(width, "0").slice(-width).split("").map(Number);
}

function isSameDigits(value, width) {
  const digits = digitsOf(value, width);
  return digits.every((digit) => digit === digits[0]);
}

function analyzeByDigits(operands, width) {
  const current = Array.from({ length: width }, () => 0);
  let total = 0;
  const rows = [];
  for (const operand of operands) {
    const sign = operand >= 0 ? 1 : -1;
    const digits = digitsOf(operand, width);
    const kinds = [];
    for (let i = 0; i < width; i++) {
      const delta = sign * digits[i];
      if (delta === 0) {
        kinds.push("direct");
        continue;
      }
      const move = classifyMove(current[i], delta);
      if (!move) {
        kinds.push("invalid");
        continue;
      }
      kinds.push(move.kind);
      current[i] = move.next;
    }
    total += operand;
    rows.push({ operand, kinds, total });
  }
  return rows;
}

function validDifferent2dNf(operands) {
  const rows = analyzeByDigits(operands, 2);
  return operands.every((operand) => Math.abs(operand) >= 10) &&
    rows.every((row) => row.total >= 0 && row.total <= 99 && row.kinds.every((kind) => kind === "direct"));
}

function validSame2dFormula5(operands) {
  const rows = analyzeByDigits(operands, 2);
  return operands.every((operand) => Math.abs(operand) >= 10 && isSameDigits(operand, 2)) &&
    rows.every((row) => row.total >= 0 && row.total <= 99 && !row.kinds.includes("ten") && !row.kinds.includes("invalid")) &&
    rows.slice(1).every((row) => row.kinds.some((kind) => kind === "five"));
}

function validDifferent2dFormula5(operands) {
  const rows = analyzeByDigits(operands, 2);
  return operands.every((operand) => Math.abs(operand) >= 10) &&
    rows.every((row) => row.total >= 0 && row.total <= 99 && !row.kinds.includes("ten") && !row.kinds.includes("invalid")) &&
    rows.some((row) => row.kinds.some((kind) => kind === "five"));
}

function validDifferent2dFormula10(operands) {
  const rows = analyzeByDigits(operands, 2);
  return rows.every((row) => row.total >= 0 && row.total <= 99 && !row.kinds.includes("invalid")) &&
    rows.some((row) => row.kinds.some((kind) => kind === "ten"));
}

function validSame3dNf(operands) {
  const rows = analyzeByDigits(operands, 3);
  return operands.every((operand) => Math.abs(operand) >= 100 && isSameDigits(operand, 3)) &&
    rows.every((row) => row.total >= 0 && row.total <= 999 && row.kinds.every((kind) => kind === "direct"));
}

function validSame3dFormula5(operands) {
  const rows = analyzeByDigits(operands, 3);
  return operands.every((operand) => Math.abs(operand) >= 100 && isSameDigits(operand, 3)) &&
    rows.every((row) => row.total >= 0 && row.total <= 999 && !row.kinds.includes("ten") && !row.kinds.includes("invalid")) &&
    rows.some((row) => row.kinds.some((kind) => kind === "five"));
}

function scale(operands, factor) {
  return operands.map((item) => item * factor);
}

function reduceScale(operands, factor) {
  return operands.map((item) => item / factor);
}

assert.equal(isDirectUnitsSequence([4, 5, -8, 1]), true, "4+5-8+1 must be allowed as direct units");
assert.equal(isDirectUnitsSequence([4, 1]), false, "4+1 must not be allowed without formula");
assert.equal(isDirectUnitsSequence([3, 2]), false, "3+2 must not be allowed without formula");
assert.equal(isDirectUnitsSequence([5, -1]), false, "5-1 must not be allowed without formula");
assert.equal(isDirectUnitsSequence([2, -3]), false, "intermediate negative result must not be allowed");

const base = [4, 5, -8, 1];
assert.equal(isDirectUnitsSequence(reduceScale(scale(base, 10), 10)), true, "10-90 block must preserve direct units rule");
assert.equal(isDirectUnitsSequence(reduceScale(scale(base, 11), 11)), true, "11-99 block must preserve direct units rule");
assert.equal(isDirectUnitsSequence(reduceScale(scale(base, 111), 111)), true, "up to 999 block must preserve direct units rule");

assert.equal(validDifferent2dNf([97, -45, 37, -52, -12]), true, "2D different NF sample 1 must be valid");
assert.equal(validDifferent2dNf([80, 15, -65, 69, -58]), true, "2D different NF sample 2 must be valid");
assert.equal(validDifferent2dNf([44, -31, 55, -56, 65]), true, "2D different NF sample 3 must be valid");
assert.equal(validDifferent2dNf([45, 41, -62]), false, "2D different NF bad sample 1 must be rejected");
assert.equal(validDifferent2dNf([35, -24, 11]), false, "2D different NF bad sample 2 must be rejected");

assert.equal(validSame2dFormula5([88, -44, 22, -33, 44]), true, "2D same +5 sample 1 must be valid");
assert.equal(validSame2dFormula5([66, -44, 33, -22, 33]), true, "2D same +5 sample 2 must be valid");
assert.equal(validSame2dFormula5([55, 11, 22, -33]), false, "2D same +5 without formulas must be rejected");
assert.equal(validSame2dFormula5([44, -22, -11, 55]), false, "2D same +5 bad sample 2 must be rejected");

assert.equal(validDifferent2dFormula5([47, -33, 42, -34]), true, "2D different +5 sample 1 must be valid");
assert.equal(validDifferent2dFormula5([80, 17, -14, 12]), true, "2D different +5 sample 2 must be valid");
assert.equal(validDifferent2dFormula5([54, 45, -69, 60]), false, "2D different +5 must reject +10 formulas");
assert.equal(validDifferent2dFormula5([61, -40, -7, -12]), false, "2D different +5 must reject mixed blocks");
assert.equal(validDifferent2dFormula5([95, -32, -8, 30, 3]), false, "2D different +5 must reject +10 examples");

assert.equal(validDifferent2dFormula10([92, -66, 37, -38, 39, -36, 56]), true, "2D different +10 sample 1 must be valid");
assert.equal(validDifferent2dFormula10([95, -32, -8, 30, 3]), true, "2D different +10 sample 2 must be valid");
assert.equal(validDifferent2dFormula10([63, 27, -57, -18, 32]), true, "2D different +10 sample 3 must be valid");
assert.equal(validDifferent2dFormula10([58, 41, -38, 18]), false, "2D different +10 must require +10 formula");
assert.equal(validDifferent2dFormula10([50, 23, 14, -43, 33]), false, "2D different +10 bad sample 2 must be rejected");

assert.equal(validSame3dNf([111, 222, -111, 555]), true, "3D same NF sample 1 must be valid");
assert.equal(validSame3dNf([888, -666, 222, -333]), true, "3D same NF sample 2 must be valid");
assert.equal(validSame3dNf([555, -444, 222, 333]), false, "3D same NF bad sample 1 must be rejected");
assert.equal(validSame3dNf([888, -444, 222, -111]), false, "3D same NF bad sample 2 must be rejected");

assert.equal(validSame3dFormula5([555, -333, 111, 222]), true, "3D same +5 sample 1 must be valid");
assert.equal(validSame3dFormula5([999, -666, 444, -111]), true, "3D same +5 sample 2 must be valid");
assert.equal(validSame3dFormula5([555, 222, 111]), false, "3D same +5 without formulas must be rejected");
assert.equal(validSame3dFormula5([888, 777, -555]), false, "3D same +5 must stay below 1000");

console.log("Methodology checks passed");
