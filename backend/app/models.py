from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class RoleEnum(str, enum.Enum):
    TANK = "tank"
    FIGHTER = "fighter"
    ASSASSIN = "assassin"
    MAGE = "mage"
    MARKSMAN = "marksman"
    SUPPORT = "support"


class TierEnum(str, enum.Enum):
    S = "S"
    A = "A"
    B = "B"
    C = "C"
    D = "D"


class CounterStrengthEnum(str, enum.Enum):
    SOFT = "soft"
    MEDIUM = "medium"
    HARD = "hard"


class SynergyStrengthEnum(str, enum.Enum):
    WEAK = "weak"
    MEDIUM = "medium"
    STRONG = "strong"


class Hero(Base):
    __tablename__ = "heroes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    role = Column(String(20), nullable=False)  # Primary role
    secondary_role = Column(String(20), nullable=True)  # Secondary/flex role (e.g., tank/support)
    image_url = Column(String(500), nullable=True)
    specialty = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)  # JSON string of skills
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tier_entries = relationship("TierListEntry", back_populates="hero")
    counters_as_hero = relationship("Counter", foreign_keys="Counter.hero_id", back_populates="hero")
    counters_as_counter = relationship("Counter", foreign_keys="Counter.countered_by_id", back_populates="countered_by")
    synergies_as_hero1 = relationship("Synergy", foreign_keys="Synergy.hero_1_id", back_populates="hero_1")
    synergies_as_hero2 = relationship("Synergy", foreign_keys="Synergy.hero_2_id", back_populates="hero_2")


class LaneEnum(str, enum.Enum):
    GOLD_LANE = "gold_lane"
    EXP_LANE = "exp_lane"
    MID_LANE = "mid_lane"
    JUNGLE = "jungle"
    ROAMER = "roamer"


class TierList(Base):
    __tablename__ = "tier_lists"
    
    id = Column(Integer, primary_key=True, index=True)
    lane = Column(String(20), nullable=False)  # gold_lane, exp_lane, mid_lane, jungle, roamer
    version = Column(String(50), nullable=False)  # e.g., "Patch 1.8.44"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    entries = relationship("TierListEntry", back_populates="tier_list", cascade="all, delete-orphan")


class TierListEntry(Base):
    __tablename__ = "tier_list_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    tier_list_id = Column(Integer, ForeignKey("tier_lists.id"), nullable=False)
    hero_id = Column(Integer, ForeignKey("heroes.id"), nullable=False)
    tier = Column(String(1), nullable=False)  # S, A, B, C, D
    notes = Column(Text, nullable=True)
    
    # Relationships
    tier_list = relationship("TierList", back_populates="entries")
    hero = relationship("Hero", back_populates="tier_entries")


class Counter(Base):
    __tablename__ = "counters"
    
    id = Column(Integer, primary_key=True, index=True)
    hero_id = Column(Integer, ForeignKey("heroes.id"), nullable=False)  # The hero
    countered_by_id = Column(Integer, ForeignKey("heroes.id"), nullable=False)  # Who counters them
    strength = Column(String(10), default="medium")  # soft, medium, hard
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    hero = relationship("Hero", foreign_keys=[hero_id], back_populates="counters_as_hero")
    countered_by = relationship("Hero", foreign_keys=[countered_by_id], back_populates="counters_as_counter")


class Synergy(Base):
    __tablename__ = "synergies"
    
    id = Column(Integer, primary_key=True, index=True)
    hero_1_id = Column(Integer, ForeignKey("heroes.id"), nullable=False)
    hero_2_id = Column(Integer, ForeignKey("heroes.id"), nullable=False)
    strength = Column(String(10), default="medium")  # weak, medium, strong
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    hero_1 = relationship("Hero", foreign_keys=[hero_1_id], back_populates="synergies_as_hero1")
    hero_2 = relationship("Hero", foreign_keys=[hero_2_id], back_populates="synergies_as_hero2")


class Draft(Base):
    __tablename__ = "drafts"
    
    id = Column(Integer, primary_key=True, index=True)
    blue_bans = Column(Text, nullable=True)  # JSON array of hero IDs
    red_bans = Column(Text, nullable=True)  # JSON array of hero IDs
    blue_picks = Column(Text, nullable=True)  # JSON array of hero IDs
    red_picks = Column(Text, nullable=True)  # JSON array of hero IDs
    winner = Column(String(10), nullable=True)  # blue, red, or null
    created_at = Column(DateTime, default=datetime.utcnow)
