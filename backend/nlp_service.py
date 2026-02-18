from thefuzz import process
import re

def match_matter(text, matters, threshold=60):
    """
    Find the best matching matter for the given text.
    matters: list of dicts or objects with 'name' and 'description' attributes.
    Returns: best matching matter object or None
    """
    if not matters:
        return None
        
    # Prepare choices map
    # We want to match against name and description
    choices = {}
    for m in matters:
        # Create a search string combining name and description
        search_str = f"{m.name} {m.description}"
        choices[search_str] = m
        
    # extractOne returns (match, score, index) or (match, score) depending on input
    # Here we pass a dict keys view or list
    best_match = process.extractOne(text, choices.keys())
    
    if best_match:
        match_str, score = best_match
        if score >= threshold:
            return choices[match_str]
            
    return None

def extract_duration(text):
    """
    Extract duration in minutes from text.
    Supports formats: "1h", "1.5 hr", "30 mins", "30m", "1 hour"
    Returns: integer minutes
    """
    text = text.lower()
    
    # Regex for hours
    # Matches: 1.5h, 1 h, 1 hour, 1 hours
    hours_match = re.search(r'(\d+(\.\d+)?)\s*(h|hr|hrs|hour|hours)', text)
    if hours_match:
        hours = float(hours_match.group(1))
        return int(hours * 60)
        
    # Regex for minutes
    # Matches: 30m, 30 min, 30 mins, 30 minutes
    minutes_match = re.search(r'(\d+)\s*(m|min|mins|minute|minutes)', text)
    if minutes_match:
        minutes = int(minutes_match.group(1))
        return minutes
        
    return 0
