from backend import nlp_service
from datetime import datetime

def test_date_extraction():
    test_cases = [
        ("on 16 Feb 2026", datetime(2026, 2, 16)),
        ("16/02/2026", datetime(2026, 2, 16)),
        ("16-02-2026", datetime(2026, 2, 16)),
        ("meeting on 16 Feb", datetime(datetime.now().year, 2, 16)),
        ("log date 16/02", datetime(datetime.now().year, 2, 16)),
        ("Matter 1404 for 2 hours on 16 Feb 2026", datetime(2026, 2, 16)),
        ("worked 30m on 20/05/2026", datetime(2026, 5, 20)),
        ("No date here 1h", None),
        ("Matter 14/04 for 2h", None), # Should not mistake matter ID for date even with 'for'
        ("14/04", None), # No context
    ]

    for text, expected in test_cases:
        actual = nlp_service.extract_date(text)
        print(f"Text: '{text}'")
        print(f"  Expected: {expected}")
        print(f"  Actual:   {actual}")
        if actual == expected:
            print("  Result: PASS")
        else:
            print("  Result: FAIL")
        print("-" * 20)

if __name__ == "__main__":
    test_date_extraction()
