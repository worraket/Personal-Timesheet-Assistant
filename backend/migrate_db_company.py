from sqlalchemy import create_engine, text
from . import database
import os

def migrate_company_column():
    """Add company_name column to the matters table if it doesn't exist."""
    db_path = "timesheet.db"
    if not os.path.exists(db_path):
        return  # DB doesn't exist yet, it will be created with the new schema

    engine = create_engine(f"sqlite:///{db_path}")
    
    with engine.connect() as conn:
        # Check if company_name exists
        result = conn.execute(text("PRAGMA table_info(matters)")).fetchall()
        columns = [row[1] for row in result]
        
        if 'company_name' not in columns:
            print("Migrating DB: Adding 'company_name' column to 'matters' table...")
            try:
                conn.execute(text("ALTER TABLE matters ADD COLUMN company_name VARCHAR"))
                conn.execute(text("CREATE INDEX ix_matters_company_name ON matters (company_name)"))
                conn.commit()
            except Exception as e:
                print(f"Error executing migration for company_name: {e}")
