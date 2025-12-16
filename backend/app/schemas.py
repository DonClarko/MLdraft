from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# Enums
class RoleEnum(str, Enum):
    TANK = "tank"
    FIGHTER = "fighter"
    ASSASSIN = "assassin"
    MAGE = "mage"
    MARKSMAN = "marksman"
    SUPPORT = "support"


class TierEnum(str, Enum):
    S = "S"
    A = "A"
    B = "B"
    C = "C"
    D = "D"


class CounterStrengthEnum(str, Enum):
    SOFT = "soft"
    MEDIUM = "medium"
    HARD = "hard"


class SynergyStrengthEnum(str, Enum):
    WEAK = "weak"
    MEDIUM = "medium"
    STRONG = "strong"


class LaneEnum(str, Enum):
    GOLD_LANE = "gold_lane"
    EXP_LANE = "exp_lane"
    MID_LANE = "mid_lane"
    JUNGLE = "jungle"
    ROAMER = "roamer"


# Hero Schemas
class HeroBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    role: str
    secondary_role: Optional[str] = None  # For flex heroes (e.g., tank/support)
    image_url: Optional[str] = None
    specialty: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[str] = None


class HeroCreate(HeroBase):
    pass


class HeroUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    role: Optional[str] = None
    secondary_role: Optional[str] = None
    image_url: Optional[str] = None
    specialty: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[str] = None


class HeroResponse(HeroBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class HeroWithTier(HeroResponse):
    tier: Optional[str] = None
    tier_notes: Optional[str] = None


# Tier List Schemas
class TierListEntryBase(BaseModel):
    hero_id: int
    tier: str
    notes: Optional[str] = None


class TierListEntryCreate(TierListEntryBase):
    pass


class TierListEntryResponse(TierListEntryBase):
    id: int
    hero: Optional[HeroResponse] = None
    
    class Config:
        from_attributes = True


class TierListBase(BaseModel):
    lane: str  # gold_lane, exp_lane, mid_lane, jungle, roamer
    version: str
    is_active: bool = True


class TierListCreate(TierListBase):
    entries: Optional[List[TierListEntryCreate]] = []


class TierListUpdate(BaseModel):
    lane: Optional[str] = None
    version: Optional[str] = None
    is_active: Optional[bool] = None
    entries: Optional[List[TierListEntryCreate]] = None


class TierListResponse(TierListBase):
    id: int
    created_at: datetime
    updated_at: datetime
    entries: List[TierListEntryResponse] = []
    
    class Config:
        from_attributes = True


# Counter Schemas
class CounterBase(BaseModel):
    hero_id: int
    countered_by_id: int
    strength: str = "medium"
    explanation: Optional[str] = None


class CounterCreate(CounterBase):
    pass


class CounterResponse(CounterBase):
    id: int
    created_at: datetime
    hero: Optional[HeroResponse] = None
    countered_by: Optional[HeroResponse] = None
    
    class Config:
        from_attributes = True


# Synergy Schemas
class SynergyBase(BaseModel):
    hero_1_id: int
    hero_2_id: int
    strength: str = "medium"
    explanation: Optional[str] = None


class SynergyCreate(SynergyBase):
    pass


class SynergyResponse(SynergyBase):
    id: int
    created_at: datetime
    hero_1: Optional[HeroResponse] = None
    hero_2: Optional[HeroResponse] = None
    
    class Config:
        from_attributes = True


# Draft Schemas
class DraftSuggestionRequest(BaseModel):
    bans: List[int] = []  # Hero IDs that are banned
    blue_picks: List[int] = []  # Hero IDs picked by blue team
    red_picks: List[int] = []  # Hero IDs picked by red team
    current_team: str = "blue"  # Which team is picking


class HeroSuggestion(BaseModel):
    hero: HeroResponse
    score: float
    tier: Optional[str] = None
    reasons: List[str] = []


class DraftSuggestionResponse(BaseModel):
    suggestions: List[HeroSuggestion]
    team_analysis: dict


class DraftBase(BaseModel):
    blue_bans: Optional[str] = None
    red_bans: Optional[str] = None
    blue_picks: Optional[str] = None
    red_picks: Optional[str] = None
    winner: Optional[str] = None


class DraftCreate(DraftBase):
    pass


class DraftResponse(DraftBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class AdminLogin(BaseModel):
    username: str
    password: str
