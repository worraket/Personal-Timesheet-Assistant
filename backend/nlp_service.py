from thefuzz import process, fuzz
import re

def match_matter(text, matters, threshold=60):
    """
    Find the best matching matter for the given text.
    matters: list of dicts or objects with 'name' and 'description' attributes.
    matters: list of dicts or objects with 'name' and 'description' attributes.
    Returns: list of matter objects [best_match, second_best, ...], empty list if none
    """
    candidates = []
    if not matters:
        return []
        
    # Stage 0: Explicit ID Match (Top Priority)
    # Check if any matter's external_id is present as a distinct word in the text
    # e.g. "matter id 1404" -> matches matter with external_id="1404"
    for m in matters:
        if m.external_id:
            # Look for exact word match of the ID
            if re.search(r'\b' + re.escape(m.external_id) + r'\b', text):
                return [m]

    # Stage 1: Exact Substring Match (Priority)
    # Check if any matter name is directly contained in the text
    # This fixes issues where a short matter name (e.g. "Review MOU") is part of a longer sentence
    text_lower = text.lower()
    for m in matters:
        if m.name.lower() in text_lower:
            candidates.append(m)
            
    if candidates:
        return candidates
            
    # Stage 1.5: Word Set Containment
    # Improved: Check if each word in matter name exists as a substring or full word in input
    text_words = set(re.findall(r'\w+', text_lower))
    for m in matters:
        name_words = re.findall(r'\w+', m.name.lower())
        if not name_words:
            continue
            
        all_found = True
        for word in name_words:
            # For short English words, require word boundary or exact match in text_words
            if word.isalnum() and len(word) <= 3 and word.isascii():
                if word not in text_words:
                    all_found = False
                    break
            else:
                # For Thai or longer English, check as substring
                if word not in text_lower:
                    all_found = False
                    break
        
        if all_found:
            # print(f"DEBUG: Stage 1.5 Match: {m.name}")
            candidates.append(m)

    if candidates:
        return candidates
            
    # Stage 2: Fuzzy Match (Fallback)
    # Collect all matches above threshold
    fuzzy_candidates = []
    
    for m in matters:
        search_str = f"{m.name} {m.description}"
        score_set = fuzz.token_set_ratio(text, search_str)
        score_partial = fuzz.partial_ratio(text, search_str)
        max_score = max(score_set, score_partial)
        
        if max_score >= threshold:
            fuzzy_candidates.append((m, max_score))
            
    # Sort by score desc
    fuzzy_candidates.sort(key=lambda x: x[1], reverse=True)
    
    return [c[0] for c in fuzzy_candidates]

def extract_duration(text):
    """
    Extract duration in minutes from text.
    Supports formats: "1h", "1.5 hr", "30 mins", "30m", "1 hour"
    Returns: integer minutes
    """
    text = text.lower()
    
    total_minutes = 0
    
    # Regex for hours
    # Matches: 1.5h, 1 h, 1 hour, 1 hours
    hours_match = re.search(r'(\d+(\.\d+)?)\s*(h|hr|hrs|hour|hours)', text)
    if hours_match:
        hours = float(hours_match.group(1))
        total_minutes += int(hours * 60)
        
    # Regex for minutes
    # Matches: 30m, 30 min, 30 mins, 30 minutes
    minutes_match = re.search(r'(\d+)\s*(m|min|mins|minute|minutes)', text)
    if minutes_match:
        minutes = int(minutes_match.group(1))
        total_minutes += minutes
        
    return total_minutes

def extract_date(text):
    """
    Extract date from text.
    Supports formats:
    - 16 Feb 2026
    - 16/02/2026
    - 16-02-2026
    - 16 Feb (assumes current year)
    Returns: datetime object or None
    """
    from datetime import datetime
    text = text.lower()
    now = datetime.now()

    # 1. Format: DD MMM YYYY or DD MMM
    months = {
        'jan': 1, 'january': 1,
        'feb': 2, 'february': 2,
        'mar': 3, 'march': 3,
        'apr': 4, 'april': 4,
        'may': 5,
        'jun': 6, 'june': 6,
        'jul': 7, 'july': 7,
        'aug': 8, 'august': 8,
        'sep': 9, 'september': 9,
        'oct': 10, 'october': 10,
        'nov': 11, 'november': 11,
        'dec': 12, 'december': 12
    }
    
    month_pattern = '|'.join(months.keys())
    # Match "16 Feb 2026" or "16 Feb"
    pattern1 = rf'(\d{{1,2}})\s*({month_pattern})\s*(\d{{4}})?'
    match1 = re.search(pattern1, text)
    if match1:
        day = int(match1.group(1))
        month_str = match1.group(2)
        month = months[month_str]
        year = int(match1.group(3)) if match1.group(3) else now.year
        try:
            return datetime(year, month, day)
        except ValueError:
            pass

    # 2. Format: DD/MM/YYYY or DD-MM-YYYY
    pattern2 = r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})'
    match2 = re.search(pattern2, text)
    if match2:
        day = int(match2.group(1))
        month = int(match2.group(2))
        year = int(match2.group(3))
        try:
            return datetime(year, month, day)
        except ValueError:
            pass
            
    # 3. Format: DD/MM or DD-MM (assumes current year)
    # Refined: Look for date context to avoid matching "Matter 14/04"
    # and ensures it's not part of a duration like "14/04 for 2h"
    pattern3 = r'\b(\d{1,2})[/\-](\d{1,2})\b'
    match3 = re.search(pattern3, text)
    if match3:
        # Context keywords that strongly imply a date
        context_keywords = [r'\bon\b', r'\bdate\b', r'\bdated\b', r'\bat\b']
        # Check if any context keyword appears BEFORE the match
        text_before = text[:match3.start()]
        has_context = any(re.search(kw, text_before) for kw in context_keywords)
        
        day = int(match3.group(1))
        month = int(match3.group(2))
        year = now.year
        try:
            if 1 <= month <= 12 and 1 <= day <= 31 and has_context:
                return datetime(year, month, day)
        except ValueError:
            pass

    return None
