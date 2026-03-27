import re

subjects = [
    "RE: Request Form ID: 1234 SCG Legal Client Portal (Project Alpha)",
    "RE: Request Form ID:1521  - หารือเรื่องการทำ service agreement[SCG Legal Client Portal] [AI Suggests: Legal Affairs]"
]

subject_pattern = r"RE:\s*Request Form ID:\s*(\d+)\s*(?:SCG Legal Client Portal\s*\((.*?)\)|-\s*(.*?)\[SCG Legal Client Portal\])"

for s in subjects:
    match = re.search(subject_pattern, s, re.IGNORECASE)
    if match:
        matter_id = match.group(1).strip()
        matter_name = (match.group(2) or match.group(3)).strip()
        print(f"MATCH: ID={matter_id}, Name='{matter_name}'")
    else:
        print(f"NO MATCH: {s}")
