import re
import win32com.client
import pythoncom
from datetime import datetime, timedelta

def get_outlook_matters(identifiers, limit=50, scan_depth=500):
    try:
        # Initialize COM library for the thread
        pythoncom.CoInitialize()
        
        outlook = win32com.client.Dispatch("Outlook.Application").GetNamespace("MAPI")
        inbox = outlook.GetDefaultFolder(6) # 6 = Inbox
        messages = inbox.Items
        
        # ── Optimization: Only scan recent emails with a matching subject ─────
        # Filter for the last 30 days and the subject prefix
        lookback_days = 30
        cutoff_date = (datetime.now() - timedelta(days=lookback_days)).strftime("%m/%d/%Y %H:%M %p")
        
        # DASL filter for substring match in Subject AND ReceivedTime
        # Using Jet syntax for simple date and DASL for SQL LIKE
        filter_str = f"@SQL=\"urn:schemas:httpmail:subject\" LIKE '%Request Form ID:%' " \
                     f"AND \"urn:schemas:httpmail:datereceived\" >= '{cutoff_date}'"
        
        print(f"DEBUG: Applying Filter: {filter_str}")
        restricted_messages = messages.Restrict(filter_str)
        restricted_messages.Sort("[ReceivedTime]", True) # Sort filtered results by received time descending
        
        extracted_matters = []
        count = 0
        messages_scanned = 0
        
        for message in restricted_messages:
            if messages_scanned >= scan_depth:
                break
            messages_scanned += 1
            
            if count >= limit:
                break
                
            try:
                # Even though we filtered by Subject, we still need to extract parts
                subject = message.Subject
                if not subject:
                    continue
                
                subject = subject.strip()
                
                # Pattern: RE: Request Form ID: [ID] SCG Legal Client Portal ([Matter Name])
                # Example: RE: Request Form ID: 1440 SCG Legal Client Portal (Stark Energy - Solar EPC Contract...)
                subject_pattern = r"RE:\s*Request Form ID:\s*(\d+)\s*SCG Legal Client Portal\s*\((.*?)\)"
                match = re.search(subject_pattern, subject, re.IGNORECASE)
                
                if not match:
                    continue
                
                # Extract Matter ID and Name
                matter_id = match.group(1).strip()
                matter_name = match.group(2).strip()
                
                print(f"DEBUG: Subject matched and extracted: {matter_id} - {matter_name}")

                # 2. Body Filter & Client Info Extraction
                client_name = None
                client_email = None

                if hasattr(message, "Body"):
                    body = message.Body
                    normalized_body = re.sub(r'\s+', ' ', body).lower()
                    
                    # Target phrase for relevancy check
                    user_name = identifiers.get('full_name', 'worraket tantivanishakij').lower()
                    user_email = identifiers.get('email', 'worraket@scg.com').lower()
                    safe_name = re.escape(user_name)
                    safe_email = re.escape(user_email)
                    target_regex = f"{safe_name}.*?{safe_email}.*?will contact you shortly"
                    
                    if re.search(target_regex, normalized_body, re.IGNORECASE):
                        # Extract Client Info from Body
                        # Look for "ชื่อ: [Name]" and "อีเมล: [Email]"
                        # We use the original body (not lowercase) to preserve capitalization if possible, 
                        # but regex with IGNORECASE handles the keys.
                        
                        name_match = re.search(r"ชื่อ:\s*(.+)", body)
                        if name_match:
                            client_name = name_match.group(1).strip()
                            
                        email_match = re.search(r"อีเมล:\s*(.+)", body)
                        if email_match:
                            client_email = email_match.group(1).strip()

                        # Check duplication in the current extracted list
                        # We only add to extracted_matters if it's NOT already there.
                        # The caller (main.py) will handle database checks.
                        if not any(m['external_id'] == matter_id for m in extracted_matters):
                            extracted_matters.append({
                                "name": matter_name, 
                                "external_id": matter_id,
                                "description": f"Subject: {subject} | From: {message.SenderName}",
                                "source_email_id": message.EntryID,
                                "client_name": client_name,
                                "client_email": client_email
                            })
                            count += 1
            except Exception as e:
                # Skip items that might have locked properties or accessibility issues
                continue
                
        print(f"DEBUG: Scan complete. Scanned {messages_scanned} items, found {count} potential matches.")
        return extracted_matters
    except Exception as e:
        print(f"Error accessing Outlook with Restrict: {e}")
        # Fallback to simple unoptimized scan if Restrict fails for any reason
        return []
    finally:
        pythoncom.CoUninitialize()
