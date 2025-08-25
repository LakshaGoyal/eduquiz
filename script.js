// Listen to "Generate Quiz" button click
document.getElementById("generateBtn").addEventListener("click", async () => {
    const fileInput = document.getElementById("upload");
    const file = fileInput.files[0];

    if (!file) {
        alert("Please upload a PDF or text file.");
        return;
    }

    if (file.type === "application/pdf") {
        // ✅ Handle PDF with PDF.js
        const fileReader = new FileReader();
        fileReader.onload = async function () {
            const typedarray = new Uint8Array(this.result);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let extractedText = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const text = await page.getTextContent();
                text.items.forEach((item) => {
                    extractedText += item.str + " ";
                });
            }

            sendToBackend(extractedText); // ✅ Send text to backend
        };
        fileReader.readAsArrayBuffer(file);
    } else {
        // ✅ Handle plain text file
        const text = await file.text();
        sendToBackend(text);
    }
});

// ✅ Function to call backend
async function sendToBackend(userInput) {
    try {
        const response = await fetch("https://eduquiz-8rqy.onrender.com/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: userInput })
        });

        const data = await response.json();
        console.log("Backend Response:", data);

        // Show results in output section
        document.getElementById("quizSection").style.display = "block";
        document.getElementById("output").innerText =
            data.candidates?.[0]?.content || "⚠️ No quiz generated.";
    } catch (error) {
        console.error("Error generating quiz:", error);
        document.getElementById("output").innerText =
            "❌ Error generating quiz. Please try again.";
    }
}
