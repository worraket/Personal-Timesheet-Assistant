import re

def test_outlook_patterns():
    # 1. Subject Pattern
    # Pattern: RE: Request Form ID: [ID] SCG Legal Client Portal ([Matter Name])
    subject_pattern = r"RE:\s*Request Form ID:\s*\d+\s*SCG Legal Client Portal\s*\((.*?)\)"
    
    test_subjects = [
        "RE: Request Form ID: 1234 SCG Legal Client Portal (Project Alpha)",
        "RE: Request Form ID: 999 SCG Legal Client Portal (Merger with X)",
        "FW: Request Form ID: 1234 SCG Legal Client Portal (Should Not Match)", # Wrong prefix
        "RE: Other Subject (No Match)"
    ]
    
    print("--- Testing Subject Regex ---")
    for subj in test_subjects:
        match = re.search(subject_pattern, subj, re.IGNORECASE)
        if match:
            print(f"MATCH: '{subj}' -> Matter: '{match.group(1)}'")
        else:
            print(f"NO MATCH: '{subj}'")

    # 2. Body Pattern
    # Pattern: worraket tantivanishakij ... worraket@scg.com ... will contact you shortly
    # Regex from service: r"worraket tantivanishakij.*?worraket@scg\.com.*?will contact you shortly"
    body_pattern = r"worraket tantivanishakij.*?worraket@scg\.com.*?will contact you shortly"
    
    test_bodies = [
        "Dear User, worraket tantivanishakij (worraket@scg.com) will contact you shortly regarding this matter.",
        "worraket tantivanishakij has been assigned. worraket@scg.com will contact you shortly.",
        "Random text without the key phrase."
    ]
    
    print("\n--- Testing Body Regex ---")
    for body in test_bodies:
        # Normalize like in service
        normalized = re.sub(r'\s+', ' ', body).lower()
        if re.search(body_pattern, normalized):
            print(f"MATCH: '{body[:30]}...'")
        else:
            print(f"NO MATCH: '{body[:30]}...'")

if __name__ == "__main__":
    test_outlook_patterns()
