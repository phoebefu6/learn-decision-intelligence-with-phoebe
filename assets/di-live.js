/* di-live.js - the decision intelligence lab.
   Three widgets, and the realest one measures YOU: the calibration lab scores
   your own 90% intervals against verified facts (every answer carries its
   source). The forecast game's twelve scenarios are synthetic with seeded
   outcomes - stated on the widget - but every Brier number is real arithmetic,
   including the two baseline bots. The value-of-information calculator is pure
   live math on whatever numbers you set. */
(function () {
  "use strict";

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function fmt(n, d) { return Number(n).toFixed(d === undefined ? 2 : d); }

  /* ---------- verified facts for the 90%-interval quiz (every value verified to the cited source;
     contested quantities carry their definition in the question stem - see the course map) ---------- */
  var QUESTIONS = [
    { q: "Height of Mount Everest, per the official 2020 China-Nepal joint survey", unit: "meters", ans: 8848.86, src: "https://kathmandupost.com/national/2020/12/08/it-s-official-mount-everest-is-8-848-86-metres-tall" },
    { q: "Length of the Nile, per Encyclopaedia Britannica", unit: "kilometers", ans: 6650, src: "https://www.britannica.com/science/worlds-longest-rivers-2225894" },
    { q: "Year the Eiffel Tower was completed", unit: "year", ans: 1889, src: "https://www.toureiffel.paris/en/the-monument/history" },
    { q: "Boiling point of oxygen at 1 atmosphere", unit: "degrees Celsius, negative number", ans: -182.96, src: "https://webbook.nist.gov/cgi/cbook.cgi?ID=C7782447" },
    { q: "Average Earth-Moon distance", unit: "kilometers", ans: 384400, src: "https://spaceplace.nasa.gov/moon-distance/en/" },
    { q: "Weight of the preserved blue whale heart at the Royal Ontario Museum", unit: "kilograms", ans: 180, src: "https://www.rom.on.ca/news-releases/blue-whale-heart-arrives-rom" },
    { q: "Textbook count of bones in the adult human body", unit: "bones", ans: 206, src: "https://my.clevelandclinic.org/health/body/25176-bones" },
    { q: "Official all-dynasties length of the Great Wall, per China's 2012 state survey", unit: "kilometers", ans: 21196, src: "https://www.cbc.ca/news/world/great-wall-of-china-even-longer-than-previously-thought-1.1263111" },
    { q: "Depth of Challenger Deep, per the 2021 NOAA-published survey (itself carrying a 6 m error bar)", unit: "meters", ans: 10935, src: "https://repository.library.noaa.gov/view/noaa/33477" },
    { q: "Speed of sound in dry air at 20 degrees Celsius", unit: "m/s", ans: 343, src: "https://www.physicsclassroom.com/tutorial/sound-waves/properties-of-sound/speed-of-sound" }
  ];

  /* ---------- calibration lab ---------- */
  var cal = document.getElementById("di-calibrate");
  if (cal && QUESTIONS.length) {
    var cbox = document.createElement("div");
    cbox.className = "di-wrap";
    cbox.innerHTML =
      '<div class="di-honesty">This widget measures you, not a model. Give a range you are 90 percent sure contains the true value - for every question, even the ones you feel clueless about (clueless just means a wider honest range). Answers are verified facts; each reveals its source.</div>' +
      '<div class="di-qs">' + QUESTIONS.map(function (q, i) {
        return '<div class="di-q" data-i="' + i + '"><span class="di-qt">' + (i + 1) + ' · ' + q.q + ' <em>(' + q.unit + ')</em></span>' +
          '<span class="di-io"><input type="number" step="any" class="di-lo" placeholder="low"> to <input type="number" step="any" class="di-hi" placeholder="high"></span>' +
          '<span class="di-rev"></span></div>';
      }).join("") + '</div>' +
      '<div class="di-ctl"><button class="btn primary" id="di-score" type="button">Score my calibration</button>' +
      '<span id="di-result" class="di-result"></span></div>';
    cal.appendChild(cbox);

    document.getElementById("di-score").addEventListener("click", function () {
      var hits = 0, answered = 0;
      cbox.querySelectorAll(".di-q").forEach(function (row) {
        var i = parseInt(row.getAttribute("data-i"), 10);
        var lo = parseFloat(row.querySelector(".di-lo").value);
        var hi = parseFloat(row.querySelector(".di-hi").value);
        var rev = row.querySelector(".di-rev");
        if (isNaN(lo) || isNaN(hi)) { rev.textContent = "skipped"; rev.className = "di-rev"; return; }
        answered++;
        var q = QUESTIONS[i];
        var hit = (Math.min(lo, hi) <= q.ans && q.ans <= Math.max(lo, hi));
        if (hit) hits++;
        rev.innerHTML = (hit ? "✓ " : "✗ ") + "true: <b>" + q.ans.toLocaleString() + "</b> <a href='" + q.src + "' target='_blank' rel='noopener'>source ↗</a>";
        rev.className = "di-rev " + (hit ? "di-hit" : "di-miss");
      });
      var res = document.getElementById("di-result");
      if (!answered) { res.textContent = "Answer at least one question first."; return; }
      var rate = Math.round(100 * hits / answered);
      var verdict;
      if (rate >= 80 && rate <= 100 && answered >= 8) verdict = "close to calibrated - rare on a first attempt.";
      else if (rate >= 60) verdict = "overconfident: your “90%” is behaving like a " + rate + "%. Widen until the discomfort starts - that is what 90 percent feels like.";
      else verdict = "strongly overconfident - and in completely normal company: most untrained people land here. Width is honesty, not weakness.";
      res.innerHTML = "You claimed 90% · you hit <b>" + rate + "%</b> (" + hits + " of " + answered + "). " + verdict;
    });
  }

  /* ---------- forecast game (Brier) ---------- */
  var SCEN = [
    { t: "A rival fashion app announces a loyalty program this quarter", br: 0.30, p: 0.30 },
    { t: "Mango Lane's weekly ticket volume exceeds its 90-day average next week", br: 0.45, p: 0.45 },
    { t: "An A/B test of this size reaches significance within two weeks", br: 0.35, p: 0.35 },
    { t: "The flagged high-risk churn segment actually shrinks month over month", br: 0.25, p: 0.15, hint: "the voucher campaign has NOT launched yet" },
    { t: "A new checkout flow ships on schedule this sprint", br: 0.40, p: 0.30, hint: "the team missed the last two sprint deadlines" },
    { t: "Payment-failure flags stay under 5 per day all week", br: 0.55, p: 0.55 },
    { t: "The month-end revenue number is restated after reconciliation", br: 0.20, p: 0.20 },
    { t: "A viral social post doubles signups for at least one day this month", br: 0.15, p: 0.25, hint: "a creator with 2M followers just featured the app organically" },
    { t: "The churn model's holdout accuracy drops when retrained on fresh data", br: 0.35, p: 0.35 },
    { t: "At least one exec asks for the dashboard number to be re-checked", br: 0.60, p: 0.60 },
    { t: "The data team's on-call week passes with zero pipeline incidents", br: 0.50, p: 0.35, hint: "a warehouse migration lands the same week" },
    { t: "Next month's forecasted ticket volume lands within 10% of actual", br: 0.65, p: 0.65 }
  ];
  var R = rng(20260918);
  SCEN.forEach(function (s) { s.out = (R() < s.p) ? 1 : 0; });

  var game = document.getElementById("di-brier");
  if (game) {
    var gbox = document.createElement("div");
    gbox.className = "di-wrap";
    gbox.innerHTML =
      '<div class="di-honesty">The twelve scenarios are synthetic with seeded outcomes - stated plainly. The scoring is real: your Brier score, the coin-flip bot and the base-rate bot are all computed live from the same outcomes. Each card states its base rate; four cards carry case-specific evidence worth updating on.</div>' +
      '<div id="di-round"></div>' +
      '<div class="di-ctl"><input type="range" id="di-prob" min="1" max="99" value="50">' +
      '<span id="di-plabel" class="di-result">50%</span>' +
      '<button class="btn primary" id="di-commit" type="button">Commit forecast</button></div>' +
      '<div id="di-board" class="di-board"></div>';
    game.appendChild(gbox);

    var round = 0, mySum = 0, coinSum = 0, brSum = 0, done = false;
    function showRound() {
      var el = document.getElementById("di-round");
      if (round >= SCEN.length) {
        done = true;
        el.innerHTML = '<div class="di-final">All twelve committed. Final Brier scores (lower is better):</div>';
        document.getElementById("di-commit").disabled = true;
        return;
      }
      var s = SCEN[round];
      el.innerHTML = '<div class="di-scen"><b>Round ' + (round + 1) + ' of 12.</b> ' + s.t + '.' +
        ' <span class="di-br">base rate for events like this: ' + Math.round(100 * s.br) + '%</span>' +
        (s.hint ? '<span class="di-hint">case evidence: ' + s.hint + '</span>' : '') + '</div>';
    }
    function board() {
      var n = round;
      if (!n) { document.getElementById("di-board").innerHTML = ""; return; }
      document.getElementById("di-board").innerHTML =
        '<div class="di-row"><span>You</span><b>' + fmt(mySum / n, 3) + '</b></div>' +
        '<div class="di-row"><span>Coin-flip bot (always 50%)</span><b>' + fmt(coinSum / n, 3) + '</b></div>' +
        '<div class="di-row"><span>Base-rate bot (forecasts the base rate every time)</span><b>' + fmt(brSum / n, 3) + '</b></div>' +
        (done ? '<div class="di-note">' + (mySum <= brSum ? "You beat the base-rate bot - which usually means you anchored on the rates and updated only on real evidence." : "The base-rate bot beat you. The usual reason: forecasts drifted toward 0 or 100 on gut feel. Anchor on the rate, then nudge.") + '</div>' : '');
    }
    document.getElementById("di-prob").addEventListener("input", function () {
      document.getElementById("di-plabel").textContent = this.value + "%";
    });
    document.getElementById("di-commit").addEventListener("click", function () {
      if (done) return;
      var s = SCEN[round];
      var p = parseInt(document.getElementById("di-prob").value, 10) / 100;
      mySum += Math.pow(p - s.out, 2);
      coinSum += Math.pow(0.5 - s.out, 2);
      brSum += Math.pow(s.br - s.out, 2);
      var el = document.getElementById("di-round");
      round++;
      showRound();
      el.insertAdjacentHTML("afterbegin", '<div class="di-outcome">' + (s.out ? "It happened." : "It did not happen.") + ' Your ' + Math.round(p * 100) + '% scored ' + fmt(Math.pow(p - s.out, 2), 3) + '.</div>');
      board();
    });
    showRound(); board();
  }

  /* ---------- value of information calculator ---------- */
  var voi = document.getElementById("di-voi");
  if (voi) {
    var vbox = document.createElement("div");
    vbox.className = "di-wrap";
    vbox.innerHTML =
      '<div class="di-honesty">Pure live arithmetic - change any number and everything recomputes. Preset: Mango Lane weighs a $12k retention campaign that pays off only if the voucher hypothesis is true, against commissioning a $5k study first.</div>' +
      '<div class="di-grid">' +
      '<label>P(hypothesis true) <input type="range" id="voi-p" min="1" max="99" value="70"><b id="voi-pl">70%</b></label>' +
      '<label>Net gain if you act and it is true ($k) <input type="number" id="voi-win" value="18"></label>' +
      '<label>Net loss if you act and it is false ($k) <input type="number" id="voi-lose" value="12"></label>' +
      '<label>Cost of the study ($k) <input type="number" id="voi-study" value="5"></label>' +
      '</div><div id="voi-out" class="di-board"></div>';
    voi.appendChild(vbox);

    function calc() {
      var p = parseInt(document.getElementById("voi-p").value, 10) / 100;
      document.getElementById("voi-pl").textContent = Math.round(p * 100) + "%";
      var win = parseFloat(document.getElementById("voi-win").value) || 0;
      var lose = parseFloat(document.getElementById("voi-lose").value) || 0;
      var study = parseFloat(document.getElementById("voi-study").value) || 0;
      var evAct = p * win - (1 - p) * lose;
      var evSkip = 0;
      var best = Math.max(evAct, evSkip);
      var evPI = p * Math.max(win, 0) + (1 - p) * Math.max(-lose, 0);
      var evpi = evPI - best;
      document.getElementById("voi-out").innerHTML =
        '<div class="di-row"><span>EV of acting now</span><b>$' + fmt(evAct, 1) + 'k</b></div>' +
        '<div class="di-row"><span>EV of skipping</span><b>$' + fmt(evSkip, 1) + 'k</b></div>' +
        '<div class="di-row"><span>EV with perfect information</span><b>$' + fmt(evPI, 1) + 'k</b></div>' +
        '<div class="di-row di-evpi"><span>EVPI - the most ANY study is worth</span><b>$' + fmt(evpi, 1) + 'k</b></div>' +
        '<div class="di-note">' + (evpi >= study
          ? 'The $' + fmt(study, 0) + 'k study can be worth buying: perfect information would be worth $' + fmt(evpi, 1) + 'k, and a good study captures part of that.'
          : 'Do not buy the $' + fmt(study, 0) + 'k study: even PERFECT information is only worth $' + fmt(evpi, 1) + 'k here. Decide with what you have.') + '</div>';
    }
    ["voi-p", "voi-win", "voi-lose", "voi-study"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", calc);
    });
    calc();
  }

  window.DILIVE = { SCEN: SCEN };
})();
