import re
import win32com.client
import pythoncom
from datetime import datetime, timedelta

def get_outlook_matters(limit=50, scan_depth=200):
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
                
                # DEBUG
                # print(f"DEBUG: Checking subject: {subject}")
                    
                subject_pattern = r"RE:\s*Request Form ID:.*SCG Legal Client Portal"
                if not re.search(subject_pattern, subject, re.IGNORECASE):
                    continue
                
                print(f"DEBUG: Subject MATCHED: {subject}")

                # 2. Body Filter
                # Check for specific assignment phrase in body
                if hasattr(message, "Body"):
                    normalized_body = re.sub(r'\s+', ' ', message.Body).lower()
                    
                    # Target phrase from user input
                    # Use stricter regex but allow for punctuation/brackets around email
                    target_regex = r"worraket tantivanishakij.*?worraket@scg\.com.*?will contact you shortly"
                    
                    if re.search(target_regex, normalized_body):
                        # Check if we already have this subject in our list
                        if not any(m['name'] == subject for m in extracted_matters):
                            extracted_matters.append({
                                "name": subject, 
                                "description": f"From: {message.SenderName} | {message.Body[:100]}...",
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
