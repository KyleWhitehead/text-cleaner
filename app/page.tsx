"use client";
import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  function cleanText(text: string) {
    let cleaned = text;

    // Remove hidden formatting characters
    cleaned = cleaned.replace(/[\u200B-\u200F\uFEFF\u00AD]/g, "");

    // Normalize quotes
    cleaned = cleaned.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, " ");

    // Remove URLs + emails
    cleaned = cleaned.replace(/https?:\/\/\S+/g, "");
    cleaned = cleaned.replace(/\S+@\S+\.\S+/g, "");

    // Remove emojis
    cleaned = cleaned.replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}]/gu,
      ""
    );

    // Fix broken paragraphs
    cleaned = cleaned.replace(/\n{2,}/g, "\n");

    // Remove extra spaces
    cleaned = cleaned.replace(/[ \t]+/g, " ");

    // Add missing space after punctuation
    cleaned = cleaned.replace(/([.,!?])(?=\S)/g, "$1 ");

    // Split camelCase / mashed words
    cleaned = cleaned.replace(/([a-z])([A-Z])/g, "$1 $2");

    // Lowercase everything
    cleaned = cleaned.toLowerCase();

    // --- DICTIONARY FOR SPELLING + SOUNDEX ---
    const dictionary = [
      "my", "name", "is", "bonnie", "clyde", "and",
      "john", "bobby",
      "hello", "world", "test", "this", "that", "you",
      "are", "good", "bad", "awesome", "cool"
    ];

    // --- SOUNDEX IMPLEMENTATION ---
    function soundex(word: string) {
      const firstLetter = word[0].toUpperCase();
      const map: Record<string, string> = {
        a: "", e: "", i: "", o: "", u: "", y: "", h: "", w: "",
        b: "1", f: "1", p: "1", v: "1",
        c: "2", g: "2", j: "2", k: "2", q: "2", s: "2", x: "2", z: "2",
        d: "3", t: "3",
        l: "4",
        m: "5", n: "5",
        r: "6"
      };

      let encoded = firstLetter;
      let prev = map[word[0].toLowerCase()] || "";

      for (let i = 1; i < word.length; i++) {
        const char = word[i].toLowerCase();
        const code = map[char] || "";

        if (code !== prev) {
          encoded += code;
        }
        if (code !== "") prev = code;
      }

      return encoded.padEnd(4, "0").slice(0, 4);
    }

    // --- LEVENSHTEIN DISTANCE ---
    function levenshtein(a: string, b: string) {
      const matrix = Array.from({ length: a.length + 1 }, () =>
        Array(b.length + 1).fill(0)
      );

      for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
      for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + cost
          );
        }
      }
      return matrix[a.length][b.length];
    }

    // --- SPELL CORRECTION USING LEVENSHTEIN + SOUNDEX ---
    function correctWord(word: string) {
      let best = word;
      let bestDist = Infinity;

      const wordSoundex = soundex(word);

      for (const w of dictionary) {
        const dist = levenshtein(word, w);
        const soundMatch = soundex(w) === wordSoundex;

        if (soundMatch || dist <= 2) {
          if (dist < bestDist) {
            bestDist = dist;
            best = w;
          }
        }
      }

      return best;
    }

    cleaned = cleaned
      .split(" ")
      .map((w) => correctWord(w))
      .join(" ");

    // Capitalize sentences
    cleaned = cleaned.replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());

    // Remove extra blank lines again
    cleaned = cleaned.replace(/\n{2,}/g, "\n");

    return cleaned.trim();
  }

  function handleClean() {
    setOutput(cleanText(input));
  }

  function handleReset() {
    setInput("");
    setOutput("");
  }

  const wordCount = output.trim() ? output.trim().split(/\s+/).length : 0;
  const charCount = output.length;

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

      <button
        onClick={handleReset}
        style={{
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          cursor: "pointer",
          marginLeft: "1rem",
          marginBottom: "1rem",
        }}
      >
        Reset
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

      <p>Word Count: {wordCount}</p>
      <p>Character Count: {charCount}</p>
    </main>
  );
}




