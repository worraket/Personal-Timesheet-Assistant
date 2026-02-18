from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
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
    description = Column(Text, nullable=True) # e.g., "Email subject: RE: Acquisition of Y"
    source_email_id = Column(String, unique=True, index=True, nullable=True) # To prevent duplicate scans
    created_at = Column(DateTime, default=datetime.utcnow)

    time_logs = relationship("TimeLog", back_populates="matter")

class TimeLog(Base):
    __tablename__ = "time_logs"

    id = Column(Integer, primary_key=True, index=True)
    matter_id = Column(Integer, ForeignKey("matters.id"))
    duration_minutes = Column(Integer)
    description = Column(Text) # "Drafting letter"
    log_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    matter = relationship("Matter", back_populates="time_logs")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
