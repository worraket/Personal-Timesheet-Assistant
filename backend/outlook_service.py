import re
import win32com.client
import pythoncom
from datetime import datetime, timedelta

def get_outlook_matters(identifiers, limit=50, scan_depth=200):
    try:
        # Initialize COM library for the thread
        pythoncom.CoInitialize()
        
        outlook = win32com.client.Dispatch("Outlook.Application").GetNamespace("MAPI")
        inbox = outlook.GetDefaultFolder(6) # 6 = Inbox
        messages = inbox.Items
        messages.Sort("[ReceivedTime]", True) # Sort by received time descending
        
        extracted_matters = []
        
        # Simple extraction logic: Subject line is the potential matter
        # In a real scenario, we might look for specific patterns like "MAT-1234"
        
        count = 0
        messages_scanned = 0
        for message in messages:
            if messages_scanned >= scan_depth:
                break
            messages_scanned += 1
            
            if count >= limit:
                break
                
            try:
                subject = message.Subject
                
                # 1. Subject Filter
                # Pattern: "RE: Request Form ID: [anything] SCG Legal Client Portal"
                # Using regex for flexibility
                if not subject:
                    continue
                
                subject = subject.strip()
                
                # DEBUG
                # print(f"DEBUG: Checking subject: {subject}")
                    
                # Pattern: RE: Request Form ID: [ID] SCG Legal Client Portal ([Matter Name])
                # Example: RE: Request Form ID: 1440 SCG Legal Client Portal (Stark Energy - Solar EPC Contract...)
                
                subject_pattern = r"RE:\s*Request Form ID:\s*(\d+)\s*SCG Legal Client Portal\s*\((.*?)\)"
                match = re.search(subject_pattern, subject, re.IGNORECASE)
                
                if not match:
                    continue
                
                # Extract Matter ID and Name
                matter_id = match.group(1).strip()
                matter_name = match.group(2).strip()
                
                print(f"DEBUG: Subject MATCHED: {subject}")
                print(f"DEBUG: Extracted ID: {matter_id}, Name: {matter_name}")

                # 2. Body Filter
                # Check for specific assignment phrase in body
                if hasattr(message, "Body"):
                    normalized_body = re.sub(r'\s+', ' ', message.Body).lower()
                    
                    # Target phrase from dynamic identifiers
                    user_name = identifiers.get('full_name', 'worraket tantivanishakij').lower()
                    user_email = identifiers.get('email', 'worraket@scg.com').lower()
                    
                    # Escape for regex
                    safe_name = re.escape(user_name)
                    safe_email = re.escape(user_email)
                    
                    target_regex = f"{safe_name}.*?{safe_email}.*?will contact you shortly"
                    
                    if re.search(target_regex, normalized_body, re.IGNORECASE):
                        # Check if we already have this subject in our list
                        if not any(m['name'] == matter_name for m in extracted_matters):
                            extracted_matters.append({
                                "name": matter_name, 
                                "external_id": matter_id,
                                "description": f"Subject: {subject} | From: {message.SenderName}",
                                "source_email_id": message.EntryID
                            })
                            count += 1
            except Exception as e:
                # Some messages might be calendar invites or task requests which raise errors on some properties
                continue
                
        return extracted_matters
    except Exception as e:
        print(f"Error accessing Outlook: {e}")
        return []
    finally:
        pythoncom.CoUninitialize()
