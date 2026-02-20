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
    
    if matched:
        print(f"Matched Code: {matched.name}")
        if matched.id == 8:
            print("SUCCESS: Correctly matched 'ช่วย Review เอกสาร MOU'")
        else:
            print(f"FAILURE: Incorrect match '{matched.name}'")
    else:
        print("FAILURE: No match found")

if __name__ == "__main__":
    test_nlp_match()
