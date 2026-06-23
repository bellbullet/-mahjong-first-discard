const originalQuestions = [
  {
    difficulty: "初級",
    hand: ["1m","2m","3m","4m","5m","6m","2p","3p","4p","3s","4s","7s","9s","E"],
    answers: ["E"],
    explanation: "孤立した字牌の東が最も手組みに参加しにくい牌です。数牌の孤立牌は周辺牌を引いて両面や嵌張へ育つため、まず東から処理するのが標準です。"
  },
  {
    difficulty: "初級",
    hand: ["2m","3m","4m","6m","7m","2p","3p","4p","6p","7p","2s","3s","4s","9s"],
    answers: ["9s"],
    explanation: "9索だけが孤立しています。ほかはすべて面子・両面・完成形に近いまとまりなので、9索を切って四つのブロック候補をそのまま残します。"
  },
  {
    difficulty: "初級",
    hand: ["1m","3m","4m","5m","7m","8m","9m","2p","3p","4p","4s","5s","6s","N"],
    answers: ["1m","N"],
    explanation: "1萬切りの北単騎と、北切りの1萬単騎は、ともに残り3枚の同価な聴牌です。ドラ・場況を考慮しない条件では差がつかないため、どちらも模範解答です。"
  },
  {
    difficulty: "中級",
    hand: ["2m","3m","4m","5m","6m","8m","2p","3p","4p","6p","7p","3s","4s","5s"],
    answers: ["8m"],
    explanation: "2〜6萬は連続形として1・4・7萬などの変化を持ちます。8萬はそこから一間離れた孤立牌なので、ほかの両面ブロックを固定して8萬を切るのが素直です。"
  },
  {
    difficulty: "中級",
    hand: ["1m","2m","4m","5m","6m","7m","8m","2p","3p","4p","5s","6s","8s","9s"],
    answers: ["1m","2m","8s","9s"],
    explanation: "1・2萬、8・9索のいずれを外してもシャンテン数と一次受け入れは同じです。残る形の向きが変わるだけなので、ドラや場況を考慮しない条件では四つを同価とします。"
  },
  {
    difficulty: "中級",
    hand: ["2m","3m","5m","6m","7m","2p","3p","5p","6p","7p","3s","4s","5s","9s"],
    answers: ["9s"],
    explanation: "萬子と筒子に両面＋完成面子の好形があり、索子も完成面子です。孤立9索を残す理由がないため、形を崩さず9索を処理します。"
  },
  {
    difficulty: "中級",
    hand: ["1m","1m","2m","3m","4m","6p","7p","8p","3s","4s","5s","6s","7s","9s"],
    answers: ["9s"],
    explanation: "1萬の対子は雀頭候補として価値があります。索子34567は非常に強い連続形ですが9索は8索を引く以外の働きが薄く、ここを切ると全体の好形を保てます。"
  },
  {
    difficulty: "上級",
    hand: ["2m","3m","4m","4m","5m","6m","7m","2p","3p","4p","5s","6s","7s","8s"],
    answers: ["5s","8s"],
    explanation: "5索または8索を切ると索子を一面子に固定でき、1・4・7萬待ちの聴牌になります。萬子の複合形を崩すと一向聴へ戻るため、まずシャンテン数を優先します。"
  },
  {
    difficulty: "上級",
    hand: ["3m","4m","5m","6m","7m","8m","2p","3p","3p","4p","5p","6p","7s","8s"],
    answers: ["2p"],
    explanation: "筒子233456は2筒を外して33456とすることで雀頭候補と連続形を両立できます。萬子の六連続形と索子の両面を残し、強い変化を最大限維持します。"
  },
  {
    difficulty: "上級",
    hand: ["2m","3m","4m","5m","5m","6m","7m","8m","2p","3p","4p","6s","7s","8s"],
    answers: ["2m","5m","8m"],
    explanation: "2・5・8萬のどれを切っても聴牌し、受け入れは2・5・8萬の計9枚です。ドラや場況がない条件では一次受け入れに差がないため、三つとも模範解答です。"
  },
  {
    difficulty: "中級",
    hand: ["1m","2m","3m","7m","8m","9m","2p","3p","4p","4s","5s","7s","8s","9s"],
    answers: ["4s","5s"],
    explanation: "4索または5索を切ると、残した牌の単騎待ちで聴牌します。9索切りは受け入れの多い一向聴ですが、牌効率の基本であるシャンテン数優先では4・5索切りが模範です。"
  },
  {
    difficulty: "上級",
    hand: ["2m","3m","4m","6m","7m","8m","3p","4p","5p","5p","6p","7p","8p","9p"],
    answers: ["5p","9p"],
    explanation: "5筒切りは3・6・9筒、9筒切りは2・5・8筒の各9枚受けで、ともに聴牌です。待ちの枚数が同じため、この条件ではどちらも模範解答とします。"
  }
];

const suitNames = { m: "萬", p: "筒", s: "索" };
const honorNames = { E: "東", S: "南", W: "西", N: "北", P: "白", F: "發", C: "中" };
const honorLabels = { E: "東", S: "南", W: "西", N: "北", P: "白", F: "發", C: "中" };

function shuffle(items) {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function isValidQuestion(question) {
  if (!question || !Array.isArray(question.hand) || !Array.isArray(question.openMelds) || !Array.isArray(question.answers)) return false;
  const allTiles = [...question.hand, ...question.openMelds.flat()];
  const hasValidCount = allTiles.length === 14 && Object.values(allTiles.reduce((counts, tile) => ({ ...counts, [tile]: (counts[tile] || 0) + 1 }), {})).every((count) => count <= 4);
  const answersExist = question.answers.length > 0 && question.answers.every((tile) => question.hand.includes(tile));
  const textIsComplete = !`${question.prompt} ${question.explanation}`.includes("truncated");
  const openHandHasYaku = !question.openMelds.length || question.openMelds.some((meld) => ["P", "F", "C"].includes(meld[0]) && meld.every((tile) => tile === meld[0]));
  return hasValidCount && answersExist && textIsComplete && openHandHasYaku;
}

const questionBank = window.QUESTION_BANK.filter(isValidQuestion);

function pickQuestions() {
  const mix = { "門前・第一打": 2, "門前・中盤": 2, "一副露": 3, "二副露": 3 };
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const selected = Object.entries(mix).flatMap(([scenario, count]) =>
      shuffle(questionBank.filter((question) => question.scenario === scenario)).slice(0, count)
    );
    const difficultyCounts = selected.reduce((counts, question) => ({ ...counts, [question.difficulty]: (counts[question.difficulty] || 0) + 1 }), {});
    if (["初級", "中級", "上級"].every((level) => (difficultyCounts[level] || 0) >= 2)) return shuffle(selected);
  }
  return shuffle(questionBank).slice(0, 10);
}

let questions = pickQuestions();
let current = 0;
let answers = Array(questions.length).fill(null);

const handEl = document.querySelector("#hand");
const openMeldsEl = document.querySelector("#open-melds");
const answerPanel = document.querySelector("#answer-panel");
const nextButton = document.querySelector("#next-button");
const prevButton = document.querySelector("#prev-button");

function tileLabel(code) {
  if (honorNames[code]) return honorLabels[code];
  return `${code[0]}${suitNames[code[1]]}`;
}

function tileHTML(code) {
  if (honorNames[code]) {
    const red = code === "C" ? " red" : "";
    return `<span class="tile-face honor${red}">${honorNames[code]}</span>`;
  }
  const suit = code[1];
  return `<span class="tile-face ${suit === "m" ? "man" : suit === "p" ? "pin" : "sou"}"><span class="tile-number">${code[0]}</span><span class="tile-suit">${suitNames[suit]}</span></span>`;
}

function makeTile(code, index, interactive = true) {
  const button = document.createElement("button");
  button.className = "tile";
  button.type = "button";
  button.dataset.code = code;
  button.dataset.index = index;
  button.setAttribute("aria-label", tileLabel(code));
  button.innerHTML = tileHTML(code);
  if (interactive) button.addEventListener("click", () => selectTile(code, index));
  else button.disabled = true;
  return button;
}

function renderQuestion() {
  const q = questions[current];
  const saved = answers[current];
  document.querySelector("#difficulty").textContent = q.difficulty;
  document.querySelector("#scenario").textContent = q.scenario;
  document.querySelector(".prompt").textContent = q.prompt;
  document.querySelector("#question-number").textContent = `QUESTION ${String(current + 1).padStart(2, "0")}`;
  document.querySelector("#progress-label").textContent = `${String(current + 1).padStart(2, "0")} / ${questions.length}`;
  document.querySelector("#progress-bar").style.width = `${((current + 1) / questions.length) * 100}%`;
  handEl.innerHTML = "";
  q.hand.forEach((tile, index) => handEl.appendChild(makeTile(tile, index)));
  openMeldsEl.innerHTML = "";
  q.openMelds.forEach((meld) => {
    const group = document.createElement("div");
    group.className = "meld";
    meld.forEach((tile) => group.appendChild(makeTile(tile, 0, false)));
    openMeldsEl.appendChild(group);
  });
  prevButton.disabled = current === 0;
  answerPanel.hidden = true;
  nextButton.disabled = !saved;
  nextButton.innerHTML = current === questions.length - 1 ? "結果を見る <span>→</span>" : "次の問題 <span>→</span>";
  if (saved) showAnswer(saved.code, saved.index, false);
}

function selectTile(code, index) {
  if (answers[current]) return;
  const isCorrect = questions[current].answers.includes(code);
  answers[current] = { code, index, isCorrect };
  showAnswer(code, index, true);
}

function showAnswer(code, index, animate) {
  const q = questions[current];
  const isCorrect = q.answers.includes(code);
  [...handEl.children].forEach((tile, i) => {
    tile.disabled = true;
    if (i === index) tile.classList.add(isCorrect ? "correct-pick" : "wrong-pick", "selected");
  });
  const result = document.querySelector("#answer-result");
  result.className = `answer-result ${isCorrect ? "correct" : "incorrect"}`;
  result.textContent = isCorrect ? "○ STANDARD CHOICE" : "△ CHECK THE SHAPE";
  const answerTile = document.querySelector("#answer-tile");
  answerTile.innerHTML = "";
  q.answers.forEach((tile) => answerTile.appendChild(makeTile(tile, 0, false)));
  document.querySelector("#explanation").textContent = q.explanation;
  answerPanel.hidden = false;
  if (animate) {
    answerPanel.style.animation = "none";
    requestAnimationFrame(() => { answerPanel.style.animation = "reveal .35s ease"; });
  }
  nextButton.disabled = false;
}

function showResult() {
  const score = answers.filter((a) => a?.isCorrect).length;
  document.querySelector("#score").textContent = score;
  document.querySelector("#score-message").textContent = score >= 10 ? "好形を残す判断が身についています。" : score >= 7 ? "基本は良好。複合形の変化をもう一度確認しましょう。" : "解説を読み返し、孤立牌と複合形の優先順位を整理しましょう。";
  renderMistakeReview();
  document.querySelector("#result").hidden = false;
  document.querySelector("#result").scrollIntoView({ behavior: "smooth" });
}

function renderMistakeReview() {
  const review = document.querySelector("#mistake-review");
  review.innerHTML = "";
  const mistakes = answers.map((answer, index) => ({ answer, question: questions[index], index })).filter(({ answer }) => !answer?.isCorrect);
  const heading = document.createElement("h3");
  heading.textContent = mistakes.length ? `間違えた問題 ${mistakes.length}問` : "全問正解";
  review.appendChild(heading);
  mistakes.forEach(({ answer, question, index }) => {
    const card = document.createElement("article");
    card.className = "review-card";
    card.innerHTML = `<div class="review-head"><span>QUESTION ${String(index + 1).padStart(2, "0")}</span><span>${question.scenario} · ${question.difficulty}</span></div>`;
    const tiles = document.createElement("div"); tiles.className = "review-tiles";
    question.hand.forEach((tile) => tiles.appendChild(makeTile(tile, 0, false)));
    question.openMelds.flat().forEach((tile) => tiles.appendChild(makeTile(tile, 0, false)));
    card.appendChild(tiles);
    const choices = document.createElement("div"); choices.className = "review-choices";
    choices.innerHTML = `<span>あなたの打牌：${tileLabel(answer.code)}</span><span>模範解答：${question.answers.map(tileLabel).join("・")}</span>`;
    card.appendChild(choices);
    const text = document.createElement("p"); text.textContent = question.explanation; card.appendChild(text);
    review.appendChild(card);
  });
}

nextButton.addEventListener("click", () => {
  if (!answers[current]) return;
  if (current === questions.length - 1) return showResult();
  current += 1;
  renderQuestion();
});

prevButton.addEventListener("click", () => {
  if (current === 0) return;
  current -= 1;
  renderQuestion();
});

document.querySelector("#retry-button").addEventListener("click", () => {
  questions = pickQuestions();
  current = 0;
  answers = Array(questions.length).fill(null);
  document.querySelector("#result").hidden = true;
  document.querySelector("#mistake-review").innerHTML = "";
  renderQuestion();
  document.querySelector("#drill").scrollIntoView({ behavior: "smooth" });
});

document.querySelector("#question-count").textContent = questions.length;
document.querySelector("#score-total").textContent = `/ ${questions.length}`;
renderQuestion();
