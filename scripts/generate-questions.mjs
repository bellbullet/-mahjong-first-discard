import fs from "node:fs";

const output = new URL("../questions.generated.js", import.meta.url);
const codes = [
  ...["m", "p", "s"].flatMap((suit) => Array.from({ length: 9 }, (_, i) => `${i + 1}${suit}`)),
  "E", "S", "W", "N", "P", "F", "C"
];
const terminals = new Set([0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33]);
const labels = { m: "萬", p: "筒", s: "索", E: "東", S: "南", W: "西", N: "北", P: "白", F: "發", C: "中" };
const targets = { 初級: 34, 中級: 33, 上級: 33 };

function rngFactory(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rng = rngFactory(20260622);

const standardCache = new Map();
function standardShanten(counts) {
  const key = counts.join("");
  if (standardCache.has(key)) return standardCache.get(key);
  const work = [...counts];
  let best = 8;
  function walk(start, melds, pairs, shapes) {
    while (start < 34 && work[start] === 0) start += 1;
    if (start === 34) {
      const usableShapes = Math.min(shapes, 4 - melds);
      best = Math.min(best, 8 - melds * 2 - usableShapes - Math.min(pairs, 1));
      return;
    }
    work[start] -= 1; walk(start, melds, pairs, shapes); work[start] += 1;
    if (work[start] >= 3) {
      work[start] -= 3; walk(start, melds + 1, pairs, shapes); work[start] += 3;
    }
    if (start < 27 && start % 9 <= 6 && work[start + 1] && work[start + 2]) {
      work[start] -= 1; work[start + 1] -= 1; work[start + 2] -= 1;
      walk(start, melds + 1, pairs, shapes);
      work[start] += 1; work[start + 1] += 1; work[start + 2] += 1;
    }
    if (work[start] >= 2) {
      work[start] -= 2; walk(start, melds, pairs + 1, shapes); work[start] += 2;
    }
    if (start < 27 && start % 9 <= 7 && work[start + 1]) {
      work[start] -= 1; work[start + 1] -= 1; walk(start, melds, pairs, shapes + 1); work[start] += 1; work[start + 1] += 1;
    }
    if (start < 27 && start % 9 <= 6 && work[start + 2]) {
      work[start] -= 1; work[start + 2] -= 1; walk(start, melds, pairs, shapes + 1); work[start] += 1; work[start + 2] += 1;
    }
  }
  walk(0, 0, 0, 0);
  standardCache.set(key, best);
  return best;
}

function shanten(counts) {
  const unique = counts.filter(Boolean).length;
  const pairs = counts.filter((count) => count >= 2).length;
  const sevenPairs = 6 - pairs + Math.max(0, 7 - unique);
  const orphanUnique = counts.reduce((sum, count, i) => sum + (count && terminals.has(i) ? 1 : 0), 0);
  const orphanPair = counts.some((count, i) => count >= 2 && terminals.has(i)) ? 1 : 0;
  const thirteenOrphans = 13 - orphanUnique - orphanPair;
  return Math.min(standardShanten(counts), sevenPairs, thirteenOrphans);
}

function evaluate(handCounts) {
  return handCounts.flatMap((count, discardIndex) => {
    if (!count) return [];
    const afterDiscard = [...handCounts];
    afterDiscard[discardIndex] -= 1;
    const currentShanten = shanten(afterDiscard);
    const waits = [];
    let acceptance = 0;
    for (let draw = 0; draw < 34; draw += 1) {
      if (afterDiscard[draw] >= 4) continue;
      afterDiscard[draw] += 1;
      if (shanten(afterDiscard) < currentShanten) {
        waits.push(draw);
        acceptance += 4 - afterDiscard[draw] + 1;
      }
      afterDiscard[draw] -= 1;
    }
    return [{ discardIndex, shanten: currentShanten, waits, acceptance }];
  }).sort((a, b) => a.shanten - b.shanten || b.acceptance - a.acceptance || a.discardIndex - b.discardIndex);
}

function label(index) {
  const code = codes[index];
  return code.length === 1 ? labels[code] : `${code[0]}${labels[code[1]]}`;
}

function difficultyFor(best, leaders, runner) {
  if (leaders.length === 1 && best.shanten >= 2 && terminals.has(best.discardIndex) && (runner.shanten > best.shanten || best.acceptance - runner.acceptance >= 4)) return "初級";
  if (best.shanten <= 1 || leaders.length >= 3 || (runner.shanten === best.shanten && best.acceptance - runner.acceptance <= 3)) return "上級";
  return "中級";
}

function explanationFor(best, leaders, runner) {
  const discards = leaders.map((item) => label(item.discardIndex)).join("・");
  const waits = best.waits.map(label).join("・");
  const state = best.shanten === 0 ? "聴牌" : `${best.shanten}シャンテン`;
  let text = `打${discards}。${state}となり、受け入れは${waits}の${best.waits.length}種${best.acceptance}枚です。`;
  if (leaders.length > 1) {
    text += "シャンテン数と一次受け入れが同じため、この条件ではいずれも同価の模範解答です。";
  } else if (runner) {
    const runnerState = runner.shanten === 0 ? "聴牌" : `${runner.shanten}シャンテン`;
    text += `次点の打${label(runner.discardIndex)}は${runnerState}・${runner.acceptance}枚受けとなるため、標準的な牌効率では打${discards}を優先します。`;
  }
  return text;
}

const bank = [];
const seen = new Set();
const countsByDifficulty = { 初級: 0, 中級: 0, 上級: 0 };
let attempts = 0;
while (bank.length < 100 && attempts < 200000) {
  attempts += 1;
  const wall = codes.flatMap((_, index) => [index, index, index, index]);
  const counts = Array(34).fill(0);
  for (let draw = 0; draw < 14; draw += 1) {
    const position = Math.floor(rng() * wall.length);
    counts[wall.splice(position, 1)[0]] += 1;
  }
  const signature = counts.join("");
  if (seen.has(signature)) continue;
  const stats = evaluate(counts);
  const best = stats[0];
  if (best.shanten < 0 || best.shanten > 4 || best.acceptance < 3) continue;
  const leaders = stats.filter((item) => item.shanten === best.shanten && item.acceptance === best.acceptance);
  if (leaders.length > 4) continue;
  const runner = stats.find((item) => !leaders.some((leader) => leader.discardIndex === item.discardIndex));
  if (!runner) continue;
  const difficulty = difficultyFor(best, leaders, runner);
  if (countsByDifficulty[difficulty] >= targets[difficulty]) continue;
  seen.add(signature);
  countsByDifficulty[difficulty] += 1;
  bank.push({
    difficulty,
    hand: counts.flatMap((count, index) => Array(count).fill(codes[index])),
    answers: leaders.map((item) => codes[item.discardIndex]),
    explanation: explanationFor(best, leaders, runner),
    shanten: best.shanten,
    acceptance: best.acceptance,
    waitTypes: best.waits.length
  });
}

if (bank.length !== 100) throw new Error(`Only generated ${bank.length} questions after ${attempts} attempts: ${JSON.stringify(countsByDifficulty)}`);
const header = "// Generated deterministically by scripts/generate-questions.mjs\n";
fs.writeFileSync(output, `${header}window.QUESTION_BANK = ${JSON.stringify(bank, null, 2)};\n`, "utf8");
console.log(`Generated ${bank.length} questions in ${attempts} attempts:`, countsByDifficulty);
