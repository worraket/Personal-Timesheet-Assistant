from backend import nlp_service, database

# Mock Matters (similar to real ones)
matters = [
    database.Matter(id=1, name="GSC Matter", description="General Service Center"),
    database.Matter(id=2, name="MOU Review Matter", description="Reviewing MOUs"),
    database.Matter(id=8, name="ช่วย Review เอกสาร MOU", description="Subject: RE: Request Form ID: 1404..."),
]

def test_nlp_match():
    input_text = "Worked on ช่วย Review เอกสาร MOU review MOU for 45 minutes"
    print(f"Testing Input: {input_text}")
    
    # Use the actual service function
    matched = nlp_service.match_matter(input_text, matters)
    
    if matched and len(matched) > 0:
        best_match = matched[0]
        print(f"Matched Code: {best_match.name}")
        if best_match.id == 8:
            print("SUCCESS: Correctly matched 'ช่วย Review เอกสาร MOU'")
        else:
            print(f"FAILURE: Incorrect match '{best_match.name}'")
    else:
        print("FAILURE: No match found")

def test_clean_description():
    print("Testing clean_description...")
    test_cases = [
        # Original request
        (".., Update backend and frontend of timesheet assistance, 1.5 hours", None, "Update backend and frontend of timesheet assistance"),
        ("Update backend and frontend of timesheet assistance for 1.5 hours", None, "Update backend and frontend of timesheet assistance"),
        
        # Edge cases
        ("Review contracts for 30 mins", None, "Review contracts"),
        ("Worked on GSC Matter - draft email 15m", "GSC Matter", "draft email"),
        ("- Phone call with client, 1 hr.", None, "Phone call with client"),
        ("Research for meeting, 2.5 hours.", None, "Research for meeting"),
        ("   Clean up formatting   ", None, "Clean up formatting")
    ]
    
    success = True
    for input_text, matter_name, expected in test_cases:
        result = nlp_service.clean_description(input_text, matter_name)
        if result == expected:
            pass # Success
        else:
            print(f"FAILURE for '{input_text}':")
            print(f"  Expected: '{expected}'")
            print(f"  Got:      '{result}'")
            success = False
            
    if success:
        print("SUCCESS: All clean_description tests passed.")

if __name__ == "__main__":
    test_nlp_match()
    test_clean_description()
