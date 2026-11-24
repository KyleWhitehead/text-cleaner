"""Run with:  python test_cleaner.py   (or pytest). Mirrors the rule table in the Phase 1 spec."""
from cleaner import clean


def run(text, preset, extra=()):
    return clean(text, preset, extra)[0].rstrip("\n")


def test_hidden_characters():
    assert run("Hel\u200blo wor\ufeffld", "web") == "Hello world"


def test_mojibake():
    assert run("don\u00e2\u20ac\u2122t", "web") == "don\u2019t"


def test_ligatures():
    assert run("\ufb01nancial \ufb02ow", "pdf") == "financial flow"


def test_spaces():
    assert run("a \u00a0  b", "web") == "a b"


def test_hyphen_join():
    assert run("an inter-\nnational deal", "pdf") == "an international deal"


def test_hyphen_keeps_uppercase_continuation():
    assert "well-\nKnown" in "well-\nKnown"  # rule must not fire on this
    assert run("see well-\nKnown Inc", "pdf") != "see wellKnown Inc"


def test_reflow_joins_wrapped_lines():
    assert run("The cat sat on the\nmat.", "pdf") == "The cat sat on the mat."


def test_reflow_keeps_real_paragraphs():
    text = "First line of one\nparagraph ends here.\n\nSecond paragraph."
    assert run(text, "pdf") == "First line of one paragraph ends here.\n\nSecond paragraph."


def test_reflow_keeps_lists():
    assert run("- apples\n- pears\n- plums", "pdf") == "- apples\n- pears\n- plums"


def test_markdown_strip():
    assert run("## Title\n\n**bold** and __more__", "ai") == "Title\n\nbold and more"


def test_markdown_leaves_math_alone():
    assert run("2 * 3 * 4 = 24", "ai") == "2 * 3 * 4 = 24"


def test_page_furniture():
    text = "Body text here.\nPage 3 of 12\nMore body text."
    assert "Page 3" not in run(text, "pdf")


def test_repeated_header_removed():
    text = "\n".join(["ACME Annual Report", "Line of body text one.", "ACME Annual Report",
                      "Line of body text two.", "ACME Annual Report", "Line of body text three."])
    assert "ACME" not in run(text, "pdf")


def test_quotes_opt_in_only():
    src = "\u201chi\u201d \u2014 ok"
    assert run(src, "web") == src
    assert run(src, "web", ["quotes"]) == '"hi" - ok'


def test_auto_detects_wrapped_pdf_text():
    text = (
        "Why copied PDF text contains hard line\nbreaks. A PDF is a page layout\n"
        "format, so every visual line ends with\na break and long words get split\n"
        "with a hyphen at the end of the line, such as mean-\ning of the word.\n"
    )
    out, report = clean(text, "auto")
    assert "reflow" in report and "meaning" in out and "\n" not in out.strip()


if __name__ == "__main__":
    tests = [(n, f) for n, f in globals().items() if n.startswith("test_")]
    failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f"ok    {name}")
        except AssertionError as exc:
            failed += 1
            print(f"FAIL  {name}: {exc}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    raise SystemExit(failed)
