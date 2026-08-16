$file = "c:\Users\kylew\OneDrive\Desktop\desktop 2\text-cleaner-app\app\page.tsx"
$content = Get-Content $file -Raw

# Find and replace the cleanText function
$startIdx = $content.IndexOf("  function cleanText(text: string, extraDict: string[] = [])")
$endIdx = $content.IndexOf("  }", $startIdx + 200)

if ($startIdx -ge 0 -and $endIdx -ge 0) {
    $before = $content.Substring(0, $startIdx)
    $after = $content.Substring($endIdx + 3)
    
    $newFunction = @"
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
"@

    $newContent = $before + $newFunction + $after
    Set-Content $file $newContent
    Write-Output "File updated successfully!"
} else {
    Write-Output "Could not find cleanText function"
}
