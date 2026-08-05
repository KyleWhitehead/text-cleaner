"use client";
import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  function cleanText(text: string) {
    let cleaned = text;

    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, " ");

    // Remove emojis
    cleaned = cleaned.replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}]/gu,
      ""
    );

    // Remove URLs
    cleaned = cleaned.replace(/https?:\/\/\S+/g, "");

    // Remove emails
    cleaned = cleaned.replace(/\S+@\S+\.\S+/g, "");

    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // Add missing space after punctuation
    cleaned = cleaned.replace(/([.,!?])(?=\S)/g, "$1 ");

    // Fix merged words like "helloMynameis"
    cleaned = cleaned.replace(/([a-z])([A-Z])/g, "$1 $2");

    // Lowercase everything
    cleaned = cleaned.toLowerCase();

    // Lightweight spell corrections
    const corrections: Record<string, string> = {
      teh: "the",
      adn: "and",
      recieve: "receive",
      adress: "address",
      becuase: "because",
      seperated: "separated",
      isnt: "isn't",
      doesnt: "doesn't",
    };

    cleaned = cleaned
      .split(" ")
      .map((word) => corrections[word] || word)
      .join(" ");

    // Capitalize first letter of each sentence
    cleaned = cleaned.replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());

    return cleaned;
  }

  function handleClean() {
    setOutput(cleanText(input));
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Text Cleaner</h1>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste text here..."
        style={{
          width: "100%",
          height: "150px",
          padding: "1rem",
          fontSize: "1rem",
          marginBottom: "1rem",
        }}
      />

      <button
        onClick={handleClean}
        style={{
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          cursor: "pointer",
          marginBottom: "1rem",
        }}
      >
        Clean Text
      </button>

      <h2>Output</h2>
      <div
        style={{
          whiteSpace: "pre-wrap",
          padding: "1rem",
          background: "#f4f4f4",
          borderRadius: "8px",
          minHeight: "100px",
        }}
      >
        {output}
      </div>
    </main>
  );
}


