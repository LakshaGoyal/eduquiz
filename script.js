let uploadedFile = null;

document.getElementById("upload").addEventListener("change", (event) => {
  uploadedFile = event.target.files[0];
});

document.getElementById("generateBtn").addEventListener("click", handleFile);

async function handleFile() {
  if (!uploadedFile) {
    alert("Please upload a PDF first!");
    return;
  }

  // Show loading
  const outputEl = document.getElementById("output");
  outputEl.innerText = "⏳ Generating quiz... please wait...";
  document.getElementById("quizSection").style.display = "block";

  // Convert PDF to text (basic with pdf.js)
  const reader = new FileReader();
  reader.onload = async function () {
    const typedarray = new Uint8Array(this.result);

    const pdf = await pdfjsLib.getDocument(typedarray).promise;
    let textContent = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const text = await page.getTextContent();
      text.items.forEach((item) => (textContent += item.str + " "));
    }

    // Call backend (server.js) with extracted text
    try {
      const response = await fetch("https://eduquiz-8rqy.onrender.com/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userInput }),
      });

      const data = await response.json();
      console.log("Gemini response:", data);

      // ✅ Gemini puts text here:
      const quizText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "❌ No quiz generated. Check API response.";

      outputEl.innerText = quizText;
    } catch (err) {
      console.error("Frontend error:", err);
      outputEl.innerText = "❌ Error generating quiz: " + err.message;
    }
  };

  reader.readAsArrayBuffer(uploadedFile);
}

