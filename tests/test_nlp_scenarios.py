from backend import nlp_service, database

def run_tests():
    # Mock Matters representing real data
    matters = [
        database.Matter(id=1, name="General", description="Unassigned time", external_id="0001"),
        database.Matter(id=2, name="MOU Review", description="Reviewing MOUs with partners", external_id="1002"),
        database.Matter(id=3, name="Tripartite Agreement", description="Three party agreement drafting", external_id="1003"),
        database.Matter(id=4, name="GSC Matter", description="General Service Center requests", external_id="2000"),
        database.Matter(id=5, name="DOW Chemical Rebate", description="Rebates and refunds", external_id="3000"),
        database.Matter(id=6, name="Thai Text ซ่อมแซม", description="Repair works", external_id="4000"),
    ]

    test_cases = [
        # 1. Explicit ID Matching (Stage 0)
        ("Worked on matter id 1003", 3, "Explicit ID 1003 -> Tripartite Agreement"),
        ("Review comments for matter id 1002", 2, "Explicit ID 1002 -> MOU Review"),
        ("id 2000 GSC work", 4, "Explicit ID 2000 -> GSC Matter"),
        
        # 2. Exact Substring Matching (Stage 1)
        ("Drafting the Tripartite Agreement today", 3, "Exact substring 'Tripartite Agreement'"),
        ("Please Review MOU for approval", 2, "Exact substring 'Review MOU'"),
        ("Going to do Thai Text ซ่อมแซม now", 6, "Exact Thai substring"),

        # 3. Fuzzy Matching - Token Set (Stage 2)
        ("Agreement Tripartite drafting", 3, "Out of order 'Agreement Tripartite' -> Tripartite Agreement"),
        ("Rebate for DOW Chemical", 5, "Out of order 'Rebate DOW Chemical' -> DOW Chemical Rebate"),
        
        # 4. Fuzzy Matching - Partial (Stage 2)
        ("DOW Chemical", 5, "Partial 'DOW Chemical' -> DOW Chemical Rebate"),
        ("GSC request", 4, "Partial 'GSC' -> GSC Matter"),

        # 5. Negative / Tricky Cases
        ("Unknown work", 1, "Should likely fail or match General if threshold low, but 'General' has ID 1"),
        ("Review comments from BD team on the draft Tripartite Agreement for 30 minutes, matter id 1404", None, "Explicit ID 1404 does NOT exist -> Should NOT match Tripartite Agreement because ID logic is priority? Or should it fall back?"), 
        # Note: Current logic checks ID first. If ID not found, it proceeds to Exact/Fuzzy. 
        # If "1404" is not in DB, it won't match ID. Then it enters Exact/Fuzzy and might match "Tripartite Agreement".
    ]

    print(f"{'INPUT':<60} | {'EXPECTED':<10} | {'ACTUAL':<10} | {'STATUS'}")
    print("-" * 100)
    
    passes = 0
    for text, expected_id, desc in test_cases:
        import re
        text_lower = text.lower()
        text_words = set(re.findall(r'\w+', text_lower))
        
        best_score = 0
        best_m = None
        id_match = None
        exact_sub = None
        word_set_match = None
        
        for m in matters:
            # Stage 0: ID
            if m.external_id and re.search(r'\b' + re.escape(m.external_id) + r'\b', text):
                id_match = m.id
                break
            
            # Stage 1: Exact Sub
            if m.name.lower() in text_lower:
                exact_sub = m.id
                break
                
            # PROPOSED Stage 1.5: Word Set Containment
            m_words = set(re.findall(r'\w+', m.name.lower()))
            if m_words and m_words.issubset(text_words):
                word_set_match = m.id
            
            # Stage 2: Fuzzy
            from thefuzz import fuzz # Import inside if needed, or better at top
            s_set = fuzz.token_set_ratio(text, f"{m.name} {m.description}")
            s_par = fuzz.partial_ratio(text, f"{m.name} {m.description}")
            ms = max(s_set, s_par)
            if ms > best_score:
                best_score = ms
                best_m = m

        matched = nlp_service.match_matter(text, matters, threshold=60)
        actual_id = matched.id if matched else None
        
        # If we implement Stage 1.5, actual_id would change
        theoretical_id = id_match or exact_sub or word_set_match or (actual_id if actual_id else (best_m.id if best_m and best_score >=60 else None))
        
        status = "PASS" if theoretical_id == expected_id else "FAIL"
        
        if expected_id is None and theoretical_id is not None:
             status = f"WARN (Matched {theoretical_id})"
        
        logic_used = "ID" if id_match else ("ExactSub" if exact_sub else ("WordSet" if word_set_match else ("Fuzzy" if theoretical_id else "None")))
        print(f"{text[:58]:<60} | {str(expected_id):<10} | {str(theoretical_id):<10} | {status} ({logic_used} score: {best_score})")
        if status == "PASS":
            passes += 1
            
    print("-" * 100)
    print(f"Total Passed: {passes}/{len(test_cases)}")

if __name__ == "__main__":
    run_tests()
