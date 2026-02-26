import json
import os
from . import database
from sqlalchemy.orm import Session

SEED_PATH = os.path.join(os.path.dirname(__file__), "defaults", "seed_matters.json")

def import_global_matters(db: Session):
    if not os.path.exists(SEED_PATH):
        print(f"Global Matter Seed not found at {SEED_PATH}. Skipping import.")
        return

    try:
        with open(SEED_PATH, mode='r', encoding='utf-8') as file:
            seed_data = json.load(file)
            
            added_count = 0
            for row in seed_data:
                external_id = row.get("external_id")
                if not external_id: continue

                # Check if matter already exists by external_id
                existing = db.query(database.Matter).filter(database.Matter.external_id == external_id).first()
                if existing: continue

                # Add new matter from seed
                new_matter = database.Matter(
                    name=row.get("name"),
                    external_id=external_id,
                    description=row.get("description"),
                    company_name=row.get("company_name"),
                    status_flag="green", 
                    is_closed=False
                )
                db.add(new_matter)
                added_count += 1

            if added_count > 0:
                db.commit()
                print(f"Successfully seeded {added_count} global matters.")
    except Exception as e:
        print(f"Error seeding matters from JSON: {e}")
