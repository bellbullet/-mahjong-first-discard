import fs from "node:fs";

const output = new URL("../questions.generated.js", import.meta.url);
const codes = [...["m", "p", "s"].flatMap((s) => Array.from({ length: 9 }, (_, i) => `${i + 1}${s}`)), "E", "S", "W", "N", "P", "F", "C"];
const labels = { m: "萬", p: "筒", s: "索", E: "東", S: "南", W: "西", N: "北", P: "白", F: "發", C: "中" };
const terminals = new Set([0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33]);
const scenarios = [
  { name: "門前・第一打", prompt: "配牌の第一打として切る牌を選んでください", open: 0, count: { 初級: 10, 中級: 8, 上級: 7 }, maxShanten: 4 },
  { name: "門前・中盤", prompt: "ツモ後、牌効率で切る牌を選んでください", open: 0, count: { 初級: 6, 中級: 10, 上級: 9 }, maxShanten: 2 },
  { name: "一副露", prompt: "副露面子を含め、ツモ後に切る牌を選んでください", open: 1, count: { 初級: 9, 中級: 10, 上級: 11 }, maxShanten: 3 },
  { name: "二副露", prompt: "二つの副露面子を含め、ツモ後に切る牌を選んでください", open: 2, count: { 初級: 9, 中級: 5, 上級: 6 }, maxShanten: 3 }
];

function rngFactory(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const rng = rngFactory(20260623);
const cache = new Map();

function standardShanten(counts, fixedMelds = 0) {
  const key = `${fixedMelds}:${counts.join("")}`;
  if (cache.has(key)) return cache.get(key);
  const work = [...counts];
  let best = 8;
  function walk(start, melds, pairs, shapes) {
    while (start < 34 && !work[start]) start += 1;
    if (start === 34) { best = Math.min(best, 8 - melds * 2 - Math.min(shapes, 4 - melds) - Math.min(pairs, 1)); return; }
    work[start] -= 1; walk(start, melds, pairs, shapes); work[start] += 1;
    if (work[start] >= 3) { work[start] -= 3; walk(start, melds + 1, pairs, shapes); work[start] += 3; }
    if (start < 27 && start % 9 <= 6 && work[start + 1] && work[start + 2]) {
      work[start]--; work[start + 1]--; work[start + 2]--; walk(start, melds + 1, pairs, shapes); work[start]++; work[start + 1]++; work[start + 2]++;
    }
    if (work[start] >= 2) { work[start] -= 2; walk(start, melds, pairs + 1, shapes); work[start] += 2; }
    if (start < 27 && start % 9 <= 7 && work[start + 1]) { work[start]--; work[start + 1]--; walk(start, melds, pairs, shapes + 1); work[start]++; work[start + 1]++; }
    if (start < 27 && start % 9 <= 6 && work[start + 2]) { work[start]--; work[start + 2]--; walk(start, melds, pairs, shapes + 1); work[start]++; work[start + 2]++; }
  }
  walk(0, fixedMelds, 0, 0);
  cache.set(key, best);
  return best;
}

function shanten(counts, fixedMelds) {
  const normal = standardShanten(counts, fixedMelds);
  if (fixedMelds) return normal;
  const unique = counts.filter(Boolean).length;
  const pairs = counts.filter((n) => n >= 2).length;
  const sevenPairs = 6 - pairs + Math.max(0, 7 - unique);
  const orphanUnique = counts.reduce((n, count, i) => n + (count && terminals.has(i) ? 1 : 0), 0);
  const orphanPair = counts.some((count, i) => count >= 2 && terminals.has(i)) ? 1 : 0;
  return Math.min(normal, sevenPairs, 13 - orphanUnique - orphanPair);
}

function evaluate(concealed, melds) {
  const exposed = Array(34).fill(0);
  melds.flat().forEach((code) => exposed[codes.indexOf(code)]++);
  return concealed.flatMap((count, discard) => {
    if (!count) return [];
    const hand = [...concealed]; hand[discard]--;
    const current = shanten(hand, melds.length);
    const waits = []; let acceptance = 0;
    for (let draw = 0; draw < 34; draw++) {
      if (hand[draw] + exposed[draw] >= 4) continue;
      hand[draw]++;
      if (shanten(hand, melds.length) < current) { waits.push(draw); acceptance += 5 - hand[draw] - exposed[draw]; }
      hand[draw]--;
    }
    return [{ discard, shanten: current, waits, acceptance }];
  }).sort((a, b) => a.shanten - b.shanten || b.acceptance - a.acceptance || a.discard - b.discard);
}

function makeMelds(count) {
  if (!count) return [];
  const yakuhai = ["P", "F", "C"][Math.floor(rng() * 3)];
  const melds = [[yakuhai, yakuhai, yakuhai]];
  while (melds.length < count) {
    if (rng() < .72) {
      const suit = ["m", "p", "s"][Math.floor(rng() * 3)];
      const start = 1 + Math.floor(rng() * 7);
      melds.push([`${start}${suit}`, `${start + 1}${suit}`, `${start + 2}${suit}`]);
    } else {
      const code = codes[Math.floor(rng() * codes.length)];
      melds.push([code, code, code]);
    }
    const used = Object.values(Object.groupBy(melds.flat(), (x) => x)).map((x) => x.length);
    if (used.some((n) => n > 4)) melds.pop();
  }
  return melds;
}

function drawHand(melds, preferFewHonors) {
  const exposed = Array(34).fill(0); melds.flat().forEach((code) => exposed[codes.indexOf(code)]++);
  const wall = codes.flatMap((_, i) => Array(4 - exposed[i]).fill(i));
  const counts = Array(34).fill(0);
  const needed = 14 - melds.length * 3;
  for (let n = 0; n < needed; n++) {
    let candidates = wall.map((index, pos) => ({ index, pos })).filter(({ index }) => !preferFewHonors || index < 27 || rng() < .12);
    if (!candidates.length) candidates = wall.map((index, pos) => ({ index, pos }));
    const chosen = candidates[Math.floor(rng() * candidates.length)];
    counts[chosen.index]++; wall.splice(chosen.pos, 1);
  }
  return counts;
}

function label(index) { const code = codes[index]; return code.length === 1 ? labels[code] : `${code[0]}${labels[code[1]]}`; }
function classify(best, leaders, runner) {
  if (leaders.length === 1 && best.shanten >= 2 && (runner.shanten > best.shanten || best.acceptance - runner.acceptance >= 7)) return "初級";
  if (best.shanten <= 1 || leaders.length >= 3 || (runner.shanten === best.shanten && best.acceptance - runner.acceptance <= 3)) return "上級";
  return "中級";
}
function explain(best, leaders, runner, open) {
  const discard = leaders.map((x) => label(x.discard)).join("・");
  const waits = best.waits.map(label).join("・");
  const state = best.shanten === 0 ? "聴牌" : `${best.shanten}シャンテン`;
  const prefix = open ? `三元牌の役牌ポンで和了役を確保しています。副露済みの${open}面子を完成ブロックとして数えると、` : "";
  let text = `${prefix}打${discard}で${state}。受け入れは${waits}の${best.waits.length}種${best.acceptance}枚です。`;
  if (leaders.length > 1) text += "シャンテン数と一次受け入れが同じため、いずれも同価です。";
  else text += `次点の打${label(runner.discard)}は${runner.shanten === 0 ? "聴牌" : `${runner.shanten}シャンテン`}・${runner.acceptance}枚受けなので、打${discard}を優先します。`;
  return text;
}

const bank = []; const seen = new Set(); let attempts = 0; let honorAnswers = 0;
for (const scenario of scenarios) {
  for (const [wantedDifficulty, wantedCount] of Object.entries(scenario.count)) {
    let made = 0;
    while (made < wantedCount && attempts < 500000) {
      attempts++;
      const allowHonorAnswer = honorAnswers < 15 && rng() < .2;
      const melds = makeMelds(scenario.open);
      const concealed = drawHand(melds, !allowHonorAnswer);
      const signature = `${scenario.name}:${concealed.join("")}:${melds.flat().join("")}`;
      if (seen.has(signature)) continue;
      const stats = evaluate(concealed, melds), best = stats[0];
      if (best.shanten < 0 || best.shanten > scenario.maxShanten || best.acceptance < 3) continue;
      const leaders = stats.filter((x) => x.shanten === best.shanten && x.acceptance === best.acceptance);
      if (leaders.length > 4) continue;
      const runner = stats.find((x) => !leaders.some((leader) => leader.discard === x.discard));
      if (!runner || classify(best, leaders, runner) !== wantedDifficulty) continue;
      const hasHonorAnswer = leaders.some((x) => x.discard >= 27);
      if (hasHonorAnswer && (!allowHonorAnswer || honorAnswers >= 15)) continue;
      if (!hasHonorAnswer && allowHonorAnswer && honorAnswers < 15 && rng() < .5) continue;
      seen.add(signature); made++; if (hasHonorAnswer) honorAnswers++;
      bank.push({
        scenario: scenario.name, prompt: scenario.prompt, difficulty: wantedDifficulty,
        hand: concealed.flatMap((n, i) => Array(n).fill(codes[i])), openMelds: melds,
        answers: leaders.map((x) => codes[x.discard]), explanation: explain(best, leaders, runner, scenario.open),
        shanten: best.shanten, acceptance: best.acceptance, waitTypes: best.waits.length
      });
    }
    if (made < wantedCount) throw new Error(`Could not fill ${scenario.name}/${wantedDifficulty}: ${made}/${wantedCount}`);
  }
}

fs.writeFileSync(output, `// Generated deterministically by scripts/generate-questions.mjs\nwindow.QUESTION_BANK = ${JSON.stringify(bank, null, 2)};\n`, "utf8");
console.log({ questions: bank.length, attempts, honorAnswers, scenarios: Object.fromEntries(scenarios.map((s) => [s.name, bank.filter((q) => q.scenario === s.name).length])) });
