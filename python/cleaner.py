"""Rough text cleaner for Phase 1 validation.

Deterministic: it repairs formatting and never rewrites words.
Usage:
    python cleaner.py sample.txt --preset pdf --diff
    type sample.txt | python cleaner.py --preset auto      (Windows)
    cat sample.txt | python cleaner.py --preset ai         (macOS/Linux)
Cleaned text goes to stdout; the change report and diff go to stderr.
"""
import argparse
import difflib
import re
import statistics
import sys
from collections import Counter

from ftfy.fixes import fix_encoding, fix_latin_ligatures

# ---------------------------------------------------------------- constants
# ZWNJ/ZWJ (U+200C/200D) are required for correct Persian, Indic scripts and
# emoji sequences. Fine for an English-first MVP; revisit before launch.
HIDDEN_RE = re.compile(
    "[\u200b\u200c\u200d\u200e\u200f\u2060\ufeff\u00ad"
    "\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069]"
)
UNICODE_SPACES_RE = re.compile("[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]")
LIGATURES = "\ufb00\ufb01\ufb02\ufb03\ufb04\ufb05\ufb06"
TERMINAL = '.?!:"\u201d'
LIST_RE = re.compile(r"^\s*(?:[-*\u2022\u00b7]|\d+[.)]|[a-z][.)])\s+")
PAGE_RE = re.compile(
    r"^\s*(?:page\s+\d+(?:\s*(?:of|/)\s*\d+)?|\d+\s+of\s+\d+|-\s*\d+\s*-)\s*$",
    re.I,
)
QUOTE_TABLE = str.maketrans(
    {
        "\u201c": '"', "\u201d": '"', "\u201e": '"',
        "\u2018": "'", "\u2019": "'", "\u201a": "'",
        "\u2013": "-", "\u2014": "-",
    }
)

RULES = [
    "hidden", "mojibake", "ligatures", "spaces", "headers",
    "hyphens", "markdown", "reflow", "quotes",
]
PRESETS = {
    "pdf": ["hidden", "mojibake", "ligatures", "spaces", "headers", "hyphens", "reflow"],
    "ocr": ["hidden", "mojibake", "ligatures", "spaces", "headers", "hyphens", "reflow"],
    "ai": ["hidden", "spaces", "markdown"],
    "web": ["hidden", "mojibake", "spaces"],
}


# -------------------------------------------------------------------- rules
def rule_hidden(text):
    return HIDDEN_RE.sub("", text), len(HIDDEN_RE.findall(text))


def rule_mojibake(text):
    fixed = fix_encoding(text)
    return fixed, int(fixed != text)  # 1 = something was repaired


def rule_ligatures(text):
    n = sum(text.count(c) for c in LIGATURES)
    return fix_latin_ligatures(text), n


def tidy(text):
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = UNICODE_SPACES_RE.sub(" ", text)
    text = re.sub(r"(?<=\S)[ \t]{2,}(?=\S)", " ", text)
    text = re.sub(r"[ \t]+$", "", text, flags=re.M)
    return re.sub(r"\n{3,}", "\n\n", text)


def rule_spaces(text):
    out = tidy(text)
    return out, int(out != text)


def rule_hyphens(text):
    # Join only when both sides are lowercase letters, so real compounds like
    # "well-\nKnown" survive. "well-\nknown" will still be wrongly joined.
    return re.subn(r"(?<=[a-z])-\n(?=[a-z])", "", text)


def rule_markdown(text):
    n = 0
    text, k = re.subn(r"^[ ]{0,3}#{1,6}\s+", "", text, flags=re.M)
    n += k
    text, k = re.subn(r"(\*\*|__)(.+?)\1", r"\2", text)
    n += k
    text, k = re.subn(r"(?<![\w*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![\w*])", r"\1", text)
    n += k
    return text, n


def rule_headers(text):
    lines = text.split("\n")
    counts = Counter(l.strip() for l in lines if len(l.strip()) >= 8)
    repeated = {l for l, c in counts.items() if c >= 3}
    kept, removed = [], 0
    for line in lines:
        s = line.strip()
        if s and (PAGE_RE.match(s) or s in repeated):
            removed += 1
            continue
        kept.append(line)
    return "\n".join(kept), removed


def rule_reflow(text):
    lengths = [len(l.strip()) for l in text.split("\n") if l.strip()]
    median = statistics.median(lengths) if len(lengths) >= 4 else 0
    joined, paragraphs = 0, []
    for para in re.split(r"\n[ \t]*\n", text):
        out, cur = "", None
        for raw in para.split("\n"):
            line = raw.strip()
            if not line:
                continue
            if cur is None:
                cur = line
                continue
            list_item = bool(LIST_RE.match(line))
            short_end = (
                bool(median)
                and len(cur) < 0.6 * median
                and cur[-1] in TERMINAL
                and line[0].isupper()
            )
            if list_item:
                out += cur + "\n"
                cur = line
            elif short_end:  # short sentence-ending line = likely paragraph end
                out += cur + "\n\n"
                cur = line
            else:
                cur += " " + line
                joined += 1
        paragraphs.append(out + (cur or ""))
    return "\n\n".join(paragraphs), joined


def rule_quotes(text):
    n = sum(1 for c in text if c in QUOTE_TABLE)
    return text.translate(QUOTE_TABLE), n


FUNCS = {
    "hidden": rule_hidden, "mojibake": rule_mojibake, "ligatures": rule_ligatures,
    "spaces": rule_spaces, "headers": rule_headers, "hyphens": rule_hyphens,
    "markdown": rule_markdown, "reflow": rule_reflow, "quotes": rule_quotes,
}


# ------------------------------------------------------------------- engine
def auto_rules(text):
    rules = ["hidden", "mojibake", "ligatures", "spaces"]
    lines = [l for l in text.split("\n") if l.strip()]
    if len(lines) >= 4:
        no_end = sum(1 for l in lines if l.rstrip()[-1] not in TERMINAL)
        median = statistics.median(len(l.strip()) for l in lines)
        if no_end / len(lines) > 0.5 and 30 <= median <= 120:
            rules += ["headers", "hyphens", "reflow"]
    if len(re.findall(r"^#{1,6}\s|\*\*.+?\*\*", text, flags=re.M)) >= 2:
        rules.append("markdown")
    return rules


def clean(text, preset="auto", extra=()):
    """Return (cleaned_text, {rule: count}). `extra` adds rules, e.g. ['quotes']."""
    rules = auto_rules(text) if preset == "auto" else list(PRESETS[preset])
    rules += [r for r in extra if r not in rules]
    report = {}
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    for name in RULES:  # fixed order, regardless of how rules were listed
        if name in rules:
            text, count = FUNCS[name](text)
            report[name] = count
    if "spaces" in rules:
        text = tidy(text)
    return text.strip("\n") + "\n", report


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file", nargs="?", help="input file (default: stdin)")
    ap.add_argument("--preset", default="auto", choices=["auto", *PRESETS])
    ap.add_argument("--add", nargs="*", default=[], choices=RULES, help="extra rules, e.g. --add quotes")
    ap.add_argument("--diff", action="store_true", help="print a unified diff to stderr")
    args = ap.parse_args()

    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    if args.file:
        with open(args.file, encoding="utf-8", errors="replace") as fh:
            raw = fh.read()
    else:
        sys.stdin.reconfigure(encoding="utf-8")
        raw = sys.stdin.read()

    cleaned, report = clean(raw, args.preset, args.add)
    print(cleaned, end="")
    print("\nChange report:", file=sys.stderr)
    for rule, count in report.items():
        print(f"  {rule:<10} {count}", file=sys.stderr)
    if args.diff:
        diff = difflib.unified_diff(
            raw.splitlines(), cleaned.splitlines(), "original", "cleaned", lineterm=""
        )
        print("\n".join(diff), file=sys.stderr)


if __name__ == "__main__":
    main()
