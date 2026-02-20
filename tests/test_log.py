import urllib.request
import json
import ssl

def test_log_endpoint():
    url = "http://127.0.0.1:8000/api/log"
    data = {"text": "Drafting contract 1h 30m"}
    headers = {"Content-Type": "application/json"}
    
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                body = response.read().decode('utf-8')
                json_body = json.loads(body)
                print("Response:", json_body)
                
                if "duration" in json_body and json_body["duration"] == 90:
                    print("SUCCESS: Duration calculated correctly.")
                else:
                    print("FAILURE: Duration mismatch or missing.")
            else:
                print(f"FAILURE: Status code {response.status}")
                
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_log_endpoint()
