import requests
import csv
import io
from datetime import datetime

def test_export_encoding_and_filtering():
    try:
        urls = [
            ("http://127.0.0.1:8000/api/export", None, None),
            ("http://127.0.0.1:8000/api/export?start=2026-02-16&end=2026-03-15", "2026-02-16", "2026-03-15")
        ]
        
        for url, start_date_str, end_date_str in urls:
            print(f"Testing URL: {url}")
            response = requests.get(url)
            content = response.content
            
            # Check for BOM
            if content.startswith(b'\xef\xbb\xbf'):
                print("SUCCESS: Exported CSV contains UTF-8 BOM.")
            else:
                print("FAILURE: Exported CSV does NOT contain UTF-8 BOM.")
                
            text = content.decode('utf-8-sig')
            print("SUCCESS: Content decoded successfully with utf-8-sig.")
            
            # Parse CSV and verify dates if date range is provided
            reader = csv.DictReader(io.StringIO(text))
            rows = list(reader)
            print(f"Total rows exported: {len(rows)}")
            
            if start_date_str and end_date_str:
                start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
                end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
                all_within_range = True
                
                for row in rows:
                    row_date_str = row.get("Date")
                    if row_date_str:
                        row_date = datetime.strptime(row_date_str, "%Y-%m-%d").date()
                        if row_date < start_date or row_date > end_date:
                            print(f"FAILURE: Row date {row_date_str} is outside the range {start_date_str} to {end_date_str}")
                            all_within_range = False
                            break
                            
                if all_within_range:
                    print(f"SUCCESS: All exported rows are within the date range {start_date_str} to {end_date_str}.")

    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_export_encoding_and_filtering()
