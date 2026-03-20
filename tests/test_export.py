import requests

def test_export_encoding():
    try:
        urls = [
            "http://127.0.0.1:8000/api/export",
            "http://127.0.0.1:8000/api/export?start=2026-02-16&end=2026-03-15"
        ]
        
        for url in urls:
            print(f"Testing URL: {url}")
            response = requests.get(url)
            content = response.content
            
            # Check for BOM
            print(f"First 10 bytes: {content[:10]}")
            if content.startswith(b'\xef\xbb\xbf'):
                print("SUCCESS: Exported CSV contains UTF-8 BOM.")
            else:
                print("FAILURE: Exported CSV does NOT contain UTF-8 BOM.")
                
            # Check if we can decode as utf-8-sig
            text = content.decode('utf-8-sig')
            print("SUCCESS: Content decoded successfully with utf-8-sig.")
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_export_encoding()
