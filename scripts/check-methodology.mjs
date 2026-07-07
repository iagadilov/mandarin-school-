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

function isDirectUnitsSequence(operands) {
  let current = 0;
  for (const delta of operands) {
    if (!classifyDirect(current, delta)) return false;
    current += delta;
  }
  return true;
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

console.log("Methodology checks passed");
