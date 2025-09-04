const el = (sel) => document.querySelector(sel);

const state = {
  rawText: "",
  quiz: null,
  settings: {
    counts: { mcq: 3, tf: 2, short: 1 },
    difficulty: "easy"
  }
};

// ---------------- THEME ----------------
(function initTheme() {
  const toggle = el("#themeSwitch");
  const saved = localStorage.getItem("eduquiz-theme");
  if (saved === "dark") {
    document.body.classList.add("dark");
    toggle.checked = true;
  }
  toggle.addEventListener("change", () => {
    document.body.classList.toggle("dark", toggle.checked);
    localStorage.setItem("eduquiz-theme", toggle.checked ? "dark" : "light");
  });
})();

// ---------------- SETTINGS ----------------
(function initSettings() {
  const mcqEl = el("#mcqCount");
  const tfEl = el("#tfCount");
  const shortEl = el("#shortCount");
  const diffEl = el("#difficulty");

  function update() {
    state.settings.counts = {
      mcq: Number(mcqEl.value || 0),
      tf: Number(tfEl.value || 0),
      short: Number(shortEl.value || 0)
    };
    state.settings.difficulty = diffEl.value;
  }
  [mcqEl, tfEl, shortEl, diffEl].forEach(e => e.addEventListener("input", update));
  update();
})();

// ---------------- FILE HANDLING ----------------
document.getElementById("generateBtn").addEventListener("click", async () => {
  const file = document.getElementById("upload").files[0];
  if (!file) return alert("Please upload a file");

  try {
    if (file.type === "application/pdf") {
      state.rawText = await extractPdfText(file);
    } else {
      state.rawText = await file.text();
    }
  } catch {
    state.rawText = "";
  }

  state.quiz = generateHeuristicQuiz(state.rawText, state.settings);
  renderPreview(state.quiz);
  enableControls(true);
});

// ---------------- PDF TEXT EXTRACTION ----------------
async function extractPdfText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async function () {
      try {
        const typedarray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(" ") + " ";
        }
        resolve(text);
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// ---------------- QUIZ GENERATION ----------------
function generateHeuristicQuiz(text, settings) {
  const { mcq, tf, short } = settings.counts;
  const sentences = (text || "")
    .split(/[\.\?\!]/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  if (sentences.length === 0) {
    sentences.push("Water freezes at 0°C", "Earth revolves around the Sun", "Photosynthesis occurs in plants");
  }

  const questions = [];

  // MCQs
  for (let i = 0; i < mcq; i++) {
    const base = sentences[i % sentences.length];
    const options = [base, "Random fact", "Incorrect statement", "None of the above"];
    const answerIndex = 0; // make base the correct answer
    questions.push({
      id: "q" + Math.random().toString(36).slice(2),
      type: "mcq",
      prompt: `Q: ${base}`,
      options,
      answerIndex
    });
  }

  // True/False
  for (let i = 0; i < tf; i++) {
    questions.push({
      id: "q" + Math.random().toString(36).slice(2),
      type: "tf",
      prompt: `True/False: ${sentences[i % sentences.length]}`,
      answerBool: true
    });
  }

  // Short Answer
  for (let i = 0; i < short; i++) {
    questions.push({
      id: "q" + Math.random().toString(36).slice(2),
      type: "short",
      prompt: `Explain: ${sentences[i % sentences.length]}`,
      answerText: sentences[i % sentences.length]
    });
  }

  return { title: "Generated Quiz", questions, settings };
}

// ---------------- RENDER PREVIEW ----------------
function renderPreview(quiz) {
  el("#quizSection").style.display = "block";
  el("#quizTitle").textContent = "📝 Quiz Preview (Teacher Mode)";
  const out = el("#output");
  out.innerHTML = "";
  quiz.questions.forEach((q, idx) => {
    const div = document.createElement("div");
    div.className = "question teacher-view";
    div.innerHTML = `<div class="question-text"><strong>${idx + 1}.</strong> ${q.prompt}</div>`;
    if (q.type === "mcq") {
      div.innerHTML += `<div class="answer">✅ Correct answer: ${q.options?.[q.answerIndex]}</div>`;
    }
    if (q.type === "tf") div.innerHTML += `<div class="answer">✅ Correct answer: ${q.answerBool}</div>`;
    if (q.type === "short") {
      div.innerHTML += `<div class="answer">✏️ Expected keywords: <em>${q.answerText}</em></div>`;
    }
    out.appendChild(div);
  });
}

// ---------------- STUDENT QUIZ ----------------
document.getElementById("startQuizBtn").addEventListener("click", () => {
  if (!state.quiz) return;
  startQuiz(state.quiz);
});

function startQuiz(quiz) {
  el("#quizTitle").textContent = "🧑‍🎓 Student Quiz";
  const out = el("#output");
  out.innerHTML = "";
  quiz.questions.forEach((q, idx) => {
    const div = document.createElement("div");
    div.className = "question";
    div.innerHTML = `<div class="question-text"><strong>${idx + 1}.</strong> ${q.prompt}</div>`;
    if (q.type === "mcq" && q.options) {
      q.options.forEach((opt, i) => {
        div.innerHTML += `<label><input type="radio" name="${q.id}" value="${i}"> ${opt}</label><br>`;
      });
    } else if (q.type === "tf") {
      div.innerHTML += `<label><input type="radio" name="${q.id}" value="true"> True</label>
                        <label><input type="radio" name="${q.id}" value="false"> False</label>`;
    } else if (q.type === "short") {
      div.innerHTML += `<input type="text" name="${q.id}" placeholder="Your answer"/>`;
    }
    out.appendChild(div);
  });
  document.getElementById("takeQuizFooter").classList.remove("hidden");
}

// ---------------- GRADING ----------------
document.getElementById("submitAnswersBtn").addEventListener("click", () => {
  gradeQuiz(state.quiz);
});

document.getElementById("cancelQuizBtn").addEventListener("click", () => {
  renderPreview(state.quiz);
  document.getElementById("takeQuizFooter").classList.add("hidden");
});

function gradeQuiz(quiz) {
  let score = 0;
  const total = quiz.questions.length;

  quiz.questions.forEach(q => {
    let correct = false;
    let userAns = "";

    if (q.type === "mcq") {
      const sel = document.querySelector(`input[name="${q.id}"]:checked`);
      if (sel) {
        userAns = q.options[Number(sel.value)];
        correct = Number(sel.value) === q.answerIndex;
      }
    } else if (q.type === "tf") {
      const sel = document.querySelector(`input[name="${q.id}"]:checked`);
      if (sel) {
        userAns = sel.value;
        correct = (sel.value === String(q.answerBool));
      }
    } else if (q.type === "short") {
      const sel = document.querySelector(`input[name="${q.id}"]`);
      if (sel) {
        userAns = sel.value.trim();
        correct = userAns.toLowerCase().includes(q.answerText.toLowerCase());
      }
    }

    if (correct) score++;

    const questionDiv = document.querySelector(`[name="${q.id}"]`)?.closest(".question");
    if (questionDiv) {
      const resultDiv = document.createElement("div");
      resultDiv.className = "answer";
      resultDiv.innerHTML = correct
        ? `✅ Correct`
        : `❌ Incorrect. Correct answer: ${q.answerText || q.options?.[q.answerIndex] || q.answerBool}`;
      questionDiv.appendChild(resultDiv);
    }
  });

  const summary = document.createElement("div");
  summary.className = "score-summary";
  summary.innerHTML = `<strong>Final Score:</strong> ${score} / ${total} (${Math.round((score / total) * 100)}%)`;
  el("#output").appendChild(summary);

  document.getElementById("takeQuizFooter").classList.add("hidden");
}

// ---------------- SHARE LINK ----------------
document.getElementById("shareBtn").addEventListener("click", async () => {
  if (!state.quiz) return;
  const payload = encodeURIComponent(btoa(JSON.stringify(state.quiz)));
  const link = `${location.origin}${location.pathname}#mode=student&quiz=${payload}`;

  try {
    await navigator.clipboard.writeText(link);
    alert("✅ Student quiz link copied:\n" + link);
  } catch {
    prompt("Copy this link:", link);
  }
});

// ---------------- LOAD FROM LINK ----------------
(function () {
  const m = location.hash.match(/#mode=(teacher|student)&quiz=([\s\S]+)/);
  if (!m) return;
  try {
    const quiz = JSON.parse(atob(decodeURIComponent(m[2])));
    state.quiz = quiz;
    if (m[1] === "student") {
      document.querySelector(".teacher-tools").style.display = "none";
      document.querySelector("#quizSection").style.display = "block";
      startQuiz(quiz);
    } else {
      renderPreview(quiz);
    }
    enableControls(true);
  } catch (e) {
    console.error("Failed to load quiz from link", e);
  }
})();

function enableControls(enabled) {
  document.getElementById("startQuizBtn").disabled = !enabled;
  document.getElementById("exportBtn").disabled = !enabled;
  document.getElementById("shareBtn").disabled = !enabled;
}
