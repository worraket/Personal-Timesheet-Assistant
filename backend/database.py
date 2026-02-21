from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime

DATABASE_URL = "sqlite:///./timesheet.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Matter(Base):
    __tablename__ = "matters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True) # e.g., "Client X - Acquisition"
    external_id = Column(String, index=True, nullable=True) # e.g., "1234"
    description = Column(Text, nullable=True) # e.g., "Email subject: RE: Acquisition of Y"
    client_name = Column(String, nullable=True)
    client_email = Column(String, nullable=True)
    status_flag = Column(String, default="yellow") # yellow (pending), green (completed), red (urgent)
    is_closed = Column(Boolean, default=False) # True if the matter is archived/closed
    source_email_id = Column(String, unique=True, index=True, nullable=True) # To prevent duplicate scans
    created_at = Column(DateTime, default=datetime.now)

    time_logs = relationship("TimeLog", back_populates="matter")

class TimeLog(Base):
    __tablename__ = "time_logs"

    id = Column(Integer, primary_key=True, index=True)
    matter_id = Column(Integer, ForeignKey("matters.id"))
    duration_minutes = Column(Integer)
    description = Column(Text) # "Drafting letter"
    log_date = Column(DateTime, default=datetime.now)
    created_at = Column(DateTime, default=datetime.now)

    matter = relationship("Matter", back_populates="time_logs")
    
    # New field for time units
    units = Column(Integer, default=0)

class UserSetting(Base):
    # DEPRECATED: Settings are now stored in settings.json.
    # This table is kept for migration purposes only.
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
