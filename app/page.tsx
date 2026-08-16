"use client";
import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [externalDict, setExternalDict] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // -----------------------------
  // SOUNDEx
  // -----------------------------
  function soundex(word: string) {
    if (!word) return "";
    const firstLetter = word[0].toUpperCase();
    const map: Record<string, string> = {
      a: "", e: "", i: "", o: "", u: "", y: "", h: "", w: "",
      b: "1", f: "1", p: "1", v: "1",
      c: "2", g: "2", j: "2", k: "2", q: "2", s: "2", x: "2", z: "2",
      d: "3", t: "3",
      l: "4",
      m: "5", n: "5",
      r: "6",
    };

    let encoded = firstLetter;
    let prev = map[word[0].toLowerCase()] || "";

    for (let i = 1; i < word.length; i++) {
      const char = word[i].toLowerCase();
      const code = map[char] || "";
      if (code !== prev) encoded += code;
      if (code !== "") prev = code;
    }

    return encoded.padEnd(4, "0").slice(0, 4);
  }

  // -----------------------------
  // LEVENSHTEIN
  // -----------------------------
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

  // -----------------------------
  // MULTI-WORD RECONSTRUCTION
  // -----------------------------
  function reconstructWord(word: string, dictionary: string[]) {
    if (word.length < 4) return word;

    const results: string[] = [];

    // Smart alphanumeric splitting
    const alpha = word.replace(/[^a-z]/gi, "");
    if (alpha.length >= 3 && alpha.length / word.length >= 0.6) {
      word = alpha;
    }

    // Try 1-word correction
    const corrected = correctWord(word, dictionary);
    if (corrected !== word) results.push(corrected);

    // Try 2-word splits
    for (let i = 1; i < word.length; i++) {
      const w1 = word.slice(0, i);
      const w2 = word.slice(i);

      const c1 = correctWord(w1, dictionary);
      const c2 = correctWord(w2, dictionary);

      if (dictionary.includes(c1) && dictionary.includes(c2)) {
        results.push(`${c1} ${c2}`);
      }
    }

    // Try 3-word splits
    for (let i = 1; i < word.length - 1; i++) {
      for (let j = i + 1; j < word.length; j++) {
        const w1 = word.slice(0, i);
        const w2 = word.slice(i, j);
        const w3 = word.slice(j);

        const c1 = correctWord(w1, dictionary);
        const c2 = correctWord(w2, dictionary);
        const c3 = correctWord(w3, dictionary);

        if (
          dictionary.includes(c1) &&
          dictionary.includes(c2) &&
          dictionary.includes(c3)
        ) {
          results.push(`${c1} ${c2} ${c3}`);
        }
      }
    }

    return results.length ? results[0] : word;
  }

  // -----------------------------
  // WORD CORRECTION
  // -----------------------------
  function correctWord(word: string, dictionary: string[]) {
    if (!word) return word;

    let best = word;
    let bestScore = Infinity;
    const wordSoundex = soundex(word);

    for (const w of dictionary) {
      const dist = levenshtein(word, w);
      const soundMatch = soundex(w) === wordSoundex;
      const score = soundMatch ? dist * 0.5 : dist;

      if (score < bestScore && dist <= 3) {
        bestScore = score;
        best = w;
      }
    }

    return best;
  }

  // -----------------------------
  // CLEAN SINGLE SENTENCE
  // -----------------------------
  function cleanSentence(sentence: string, dictionary: string[]) {
    let cleaned = sentence;

    // Remove hidden chars
    cleaned = cleaned.replace(/[\u200B-\u200F\uFEFF\u00AD]/g, "");

    // Normalize quotes
    cleaned = cleaned.replace(/[""]/g, '"').replace(/['']/g, "'");

    // Remove HTML
    cleaned = cleaned.replace(/<[^>]*>/g, " ");

    // Remove URLs/emails
    cleaned = cleaned.replace(/https?:\/\/\S+/g, "");
    cleaned = cleaned.replace(/\S+@\S+\.\S+/g, "");

    // Remove emojis
    cleaned = cleaned.replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}]/gu,
      ""
    );

    // Extract and remove punctuation at the end
    const punctMatch = cleaned.match(/[.!?]+$/);
    const endPunct = punctMatch ? punctMatch[0] : ".";
    cleaned = cleaned.replace(/[.!?]+$/, "");

    // Fix spacing
    cleaned = cleaned.replace(/[ \t]+/g, " ");
    cleaned = cleaned.replace(/([.,!?])(?=\S)/g, "$1 ");

    // CamelCase split
    cleaned = cleaned.replace(/([a-z])([A-Z])/g, "$1 $2");

    cleaned = cleaned.toLowerCase();

    // Split into words
    let words = cleaned.split(/\s+/).filter((w) => w.length > 0);

    // Reconstruct mashed words
    words = words.flatMap((w) => reconstructWord(w, dictionary).split(" "));

    // Correct each word
    words = words.map((w) => correctWord(w, dictionary));

    // Rebuild punctuation
    let rebuilt = words.join(" ");
    rebuilt = rebuilt.replace(/\s+([.,!?])/g, "$1");
    rebuilt = rebuilt.replace(/([.,!?])(?=\S)/g, "$1 ");

    // Capitalize first letter of sentence
    rebuilt = rebuilt.charAt(0).toUpperCase() + rebuilt.slice(1);

    // Ensure sentence ends with proper punctuation
    rebuilt = rebuilt.replace(/[.!?]*$/, endPunct);

    return rebuilt.trim();
  }

  // -----------------------------
  // MAIN CLEANER
  // -----------------------------
  function cleanText(text: string, extraDict: string[] = []) {
    // Mini dictionary
    const baseDictionary = [
      "my", "name", "is", "hello", "world", "and",
      "john", "johnny", "boy", "bobby", "bonnie", "clyde",
      "this", "that", "you", "are", "cool", "awesome",
      "was", "were", "love", "like"
    ];

    const dictionary = [...baseDictionary, ...extraDict];

    // Split text into sentences while preserving punctuation
    const sentences = text.match(/[^.!?]*[.!?]+/g) || [];
    
    // If no punctuation found, treat entire text as one sentence
    if (sentences.length === 0) {
      return cleanSentence(text, dictionary);
    }

    // Process each sentence independently and rejoin
    const cleanedSentences = sentences.map((sentence) =>
      cleanSentence(sentence, dictionary)
    );

    return cleanedSentences.join(" ");
  }

  // -----------------------------
  // CLEAN BUTTON
  // -----------------------------
  async function handleClean() {
    setIsLoading(true);

    let extraDict: string[] = externalDict || [];

    if (!externalDict) {
      try {
        const res = await fetch("/api/dictionary");
        const data = await res.json();
        extraDict = Array.isArray(data.words) ? data.words : [];
        setExternalDict(extraDict);
      } catch {
        extraDict = [];
      }
    }

    const result = cleanText(input, extraDict);
    setOutput(result);
    setIsLoading(false);
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
        disabled={isLoading}
        style={{
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          cursor: "pointer",
          marginBottom: "1rem",
        }}
      >
        {isLoading ? "Cleaning..." : "Clean Text"}
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







