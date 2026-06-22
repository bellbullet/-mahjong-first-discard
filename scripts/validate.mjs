import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const block = source
  .slice(source.indexOf("const questions"), source.indexOf("const suitNames"))
  .replace("const questions", "questions");
const context = {};
vm.createContext(context);
vm.runInContext(block, context);

const codes = [
  ...["m", "p", "s"].flatMap((suit) => Array.from({ length: 9 }, (_, i) => `${i + 1}${suit}`)),
  "E", "S", "W", "N", "P", "F", "C"
];

function standardShanten(tiles) {
  const counts = codes.map((code) => tiles.filter((tile) => tile === code).length);
  let best = 8;
  function walk(start, melds, pairs, shapes) {
    while (start < 34 && counts[start] === 0) start += 1;
    if (start === 34) {
      const usableShapes = Math.min(shapes, 4 - melds);
      best = Math.min(best, 8 - melds * 2 - usableShapes - Math.min(pairs, 1));
      return;
    }
    counts[start] -= 1;
    walk(start, melds, pairs, shapes);
    counts[start] += 1;
    if (counts[start] >= 3) {
      counts[start] -= 3; walk(start, melds + 1, pairs, shapes); counts[start] += 3;
    }
    if (start < 27 && start % 9 <= 6 && counts[start + 1] && counts[start + 2]) {
      counts[start] -= 1; counts[start + 1] -= 1; counts[start + 2] -= 1;
      walk(start, melds + 1, pairs, shapes);
      counts[start] += 1; counts[start + 1] += 1; counts[start + 2] += 1;
    }
    if (counts[start] >= 2) {
      counts[start] -= 2; walk(start, melds, pairs + 1, shapes); counts[start] += 2;
    }
    if (start < 27 && start % 9 <= 7 && counts[start + 1]) {
      counts[start] -= 1; counts[start + 1] -= 1;
      walk(start, melds, pairs, shapes + 1);
      counts[start] += 1; counts[start + 1] += 1;
    }
    if (start < 27 && start % 9 <= 6 && counts[start + 2]) {
      counts[start] -= 1; counts[start + 2] -= 1;
      walk(start, melds, pairs, shapes + 1);
      counts[start] += 1; counts[start + 2] += 1;
    }
  }
  walk(0, 0, 0, 0);
  return best;
}

let failed = false;
context.questions.forEach((question, index) => {
  const counts = Object.groupBy(question.hand, (tile) => tile);
  const structuralErrors = [
    question.hand.length !== 14 && `expected 14 tiles, got ${question.hand.length}`,
    ...Object.entries(counts).filter(([, tiles]) => tiles.length > 4).map(([tile]) => `${tile} appears more than four times`),
    ...question.answers.filter((tile) => !question.hand.includes(tile)).map((tile) => `answer ${tile} is not in hand`)
  ].filter(Boolean);

  const choices = [...new Set(question.hand)].map((discard) => {
    const hand = [...question.hand];
    hand.splice(hand.indexOf(discard), 1);
    const shanten = standardShanten(hand);
    const waits = codes.filter((draw) => hand.filter((tile) => tile === draw).length < 4 && standardShanten([...hand, draw]) < shanten);
    const acceptance = waits.reduce((sum, draw) => sum + 4 - hand.filter((tile) => tile === draw).length, 0);
    return { discard, shanten, acceptance, waits };
  }).sort((a, b) => a.shanten - b.shanten || b.acceptance - a.acceptance);
  const answerStats = choices.filter((choice) => question.answers.includes(choice.discard));
  const immediateBest = choices[0];
  const immediateTies = choices.filter((choice) => choice.shanten === immediateBest.shanten && choice.acceptance === immediateBest.acceptance);
  const expected = immediateTies.map((choice) => choice.discard).sort().join(",");
  const actual = [...question.answers].sort().join(",");
  if (expected !== actual) structuralErrors.push(`answers ${actual} do not match immediate-efficiency leaders ${expected}`);
  const result = structuralErrors.length ? "FAIL" : "OK";
  if (structuralErrors.length) failed = true;
  console.log(`${String(index + 1).padStart(2, "0")} ${result} answer=${question.answers.join("/")} immediate=${immediateTies.map((choice) => choice.discard).join("/")} shanten=${immediateBest.shanten} acceptance=${immediateBest.acceptance} (${immediateBest.waits.join(",")})`);
  for (const stat of answerStats) {
    if (stat.discard !== immediateBest.discard || stat.acceptance !== immediateBest.acceptance) {
      console.log(`   note: ${stat.discard} -> shanten=${stat.shanten} acceptance=${stat.acceptance} (${stat.waits.join(",")})`);
    }
  }
  structuralErrors.forEach((error) => console.log(`   ${error}`));
});

if (failed) process.exitCode = 1;
