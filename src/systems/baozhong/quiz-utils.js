/** P02 / T056. Pure quiz transformations; no game-state, DOM or THREE imports.
 * All answers are zero-based. Outputs contain exactly q/options/answer.
 * makeRng accepts a safe integer seed, normalized modulo 2^32; not cryptographic.
 */
export function makeRng(seed = 0) {
  if (!Number.isSafeInteger(seed)) throw new TypeError('seed must be a safe integer');
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function validateQuestion(question) {
  if (!question || typeof question !== 'object' || Array.isArray(question)) throw new TypeError('question must be an object');
  const { q, options, answer } = question;
  if (typeof q !== 'string' || !q.trim()) throw new TypeError('q must be nonempty text');
  if (!Array.isArray(options) || options.length < 2 || options.length > 4) throw new TypeError('options must contain 2 to 4 strings');
  // Array.from also exposes sparse holes, which Array.every alone would skip.
  if (!Array.from(options).every(x => typeof x === 'string' && x.trim())) throw new TypeError('options must contain nonempty strings');
  if (new Set(options.map(x => x.trim().normalize('NFC'))).size !== options.length) throw new TypeError('duplicate options are ambiguous');
  if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) throw new RangeError('answer must be a valid zero-based index');
}
function randomIndex(rng, length) {
  const value = rng();
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('rng must return a finite number in [0,1)');
  return Math.floor(value * length);
}
function shuffled(question, rng) {
  const order = question.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomIndex(rng, i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { q: question.q, options: order.map(i => question.options[i]), answer: order.indexOf(question.answer) };
}
export function shuffleQuestion(question, rng = Math.random) {
  validateQuestion(question);
  if (typeof rng !== 'function') throw new TypeError('rng must be a function');
  return shuffled(question, rng);
}
export function prepareQuiz(questions, options = {}) {
  if (!Array.isArray(questions)) throw new TypeError('questions must be an array');
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object');
  const { rng = Math.random, hints = 0 } = options;
  if (typeof rng !== 'function') throw new TypeError('rng must be a function');
  if (!Number.isSafeInteger(hints) || hints < 0) throw new RangeError('hints must be a nonnegative safe integer');
  // Validate the entire input before consuming RNG, without modifying caller data.
  for (const question of questions) validateQuestion(question);
  const result = questions.map(q => shuffled(q, rng));
  let hintsUsed = 0;
  for (const question of result) {
    if (hintsUsed >= hints || question.options.length < 3) continue;
    const wrong = question.options.map((_, i) => i).filter(i => i !== question.answer);
    const removed = wrong[randomIndex(rng, wrong.length)];
    question.options.splice(removed, 1);
    if (removed < question.answer) question.answer--;
    hintsUsed++;
  }
  return { questions: result, hintsUsed };
}
