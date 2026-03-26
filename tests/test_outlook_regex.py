import re

def test_outlook_patterns():
    # 1. Subject Pattern
    subject_patterns = [
        r"RE:\s*Request Form ID:\s*(?P<matter_id>\d+)\s*SCG Legal Client Portal\s*\((?P<matter_name>.*?)\)",
        r"RE:\s*Request Form ID:\s*(?P<matter_id>\d+)\s*-\s*(?P<matter_name>.*?)\[SCG Legal Client Portal\]"
    ]
    
    test_subjects = [
        "RE: Request Form ID: 1234 SCG Legal Client Portal (Project Alpha)",
        "RE: Request Form ID:1521  - หารือเรื่องการทำ service agreement[SCG Legal Client Portal] [AI Suggests: Legal Affairs]",
        "FW: Request Form ID: 1234 SCG Legal Client Portal (Should Not Match)", # Wrong prefix
        "RE: Other Subject (No Match)"
    ]
    
    print("--- Testing Subject Regex ---")
    for subj in test_subjects:
        matched = False
        for pattern in subject_patterns:
            match = re.search(pattern, subj, re.IGNORECASE)
            if match:
                group_dict = match.groupdict()
                if 'matter_id' in group_dict and 'matter_name' in group_dict:
                    print(f"MATCH: '{subj}' -> ID: '{group_dict['matter_id']}', Matter: '{group_dict['matter_name']}'")
                    matched = True
                    break
        if not matched:
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
