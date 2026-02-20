import urllib.request
import json
import datetime

API_BASE = "http://127.0.0.1:8000/api"

def call_log(text, date=None):
    url = f"{API_BASE}/log"
    data = {"text": text}
    if date:
        data["date"] = date
    
    headers = {"Content-Type": "application/json"}
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req) as response:
            body = response.read().decode('utf-8')
            return json.loads(body)
    except Exception as e:
        return {"error": str(e)}

def test_scenarios():
    now = datetime.datetime.now()
    scenarios = [
        {
            "name": "Scenario 1: Default (Today)",
            "text": "Matter 1404 drafting 1h",
            "date": None,
            "expected_date_prefix": now.strftime("%Y-%m-%d")
        },
        {
            "name": "Scenario 2: Back-dated via Text (NLP)",
            "text": "Matter 1404 MOU for 2 hours on 16 Feb 2026",
            "date": None,
            "expected_date_prefix": "2026-02-16"
        },
        {
            "name": "Scenario 3: Back-dated via Request field (UI)",
            "text": "Matter 1404 research 30m",
            "date": "2026-02-15T10:00:00",
            "expected_date_prefix": "2026-02-15"
        },
        {
            "name": "Scenario 4: Conflict (Text takes priority)",
            "text": "Matter 1404 email 1h on 14 Feb 2026",
            "date": "2026-02-10T00:00:00",
            "expected_date_prefix": "2026-02-14"
        }
    ]

    for s in scenarios:
        print(f"--- {s['name']} ---")
        print(f"Input Text: {s['text']}")
        print(f"Input Date field: {s['date']}")
        
        result = call_log(s['text'], s['date'])
        
        if "error" in result:
            print(f"RESULT: FAIL (Error: {result['error']})")
        else:
            actual_date = result.get("date", "")
            print(f"Logged Date: {actual_date}")
            if actual_date.startswith(s['expected_date_prefix']):
                print("RESULT: PASS")
            else:
                print(f"RESULT: FAIL (Expected prefix {s['expected_date_prefix']})")
        print("\n")

if __name__ == "__main__":
    test_scenarios()
