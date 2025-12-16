from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.models import TierList, TierListEntry, Hero
from app.schemas import TierListCreate, TierListUpdate, TierListResponse, TierListEntryCreate
from app.auth import get_current_admin

router = APIRouter(prefix="/api/tier-lists", tags=["Tier Lists"])


@router.get("", response_model=List[TierListResponse])
def get_tier_lists(
    active_only: bool = Query(True, description="Only return active tier lists"),
    db: Session = Depends(get_db)
):
    """Get all tier lists"""
    query = db.query(TierList).options(
        joinedload(TierList.entries).joinedload(TierListEntry.hero)
    )
    
    if active_only:
        query = query.filter(TierList.is_active == True)
    
    tier_lists = query.order_by(TierList.lane).all()
    return tier_lists


@router.get("/{lane}", response_model=TierListResponse)
def get_tier_list_by_lane(lane: str, db: Session = Depends(get_db)):
    """Get active tier list for a specific lane (gold_lane, exp_lane, mid_lane, jungle, roamer)"""
    tier_list = db.query(TierList).options(
        joinedload(TierList.entries).joinedload(TierListEntry.hero)
    ).filter(
        TierList.lane == lane.lower(),
        TierList.is_active == True
    ).first()
    
    if not tier_list:
        raise HTTPException(status_code=404, detail=f"No active tier list found for lane: {lane}")
    
    return tier_list


@router.get("/id/{tier_list_id}", response_model=TierListResponse)
def get_tier_list_by_id(tier_list_id: int, db: Session = Depends(get_db)):
    """Get tier list by ID"""
    tier_list = db.query(TierList).options(
        joinedload(TierList.entries).joinedload(TierListEntry.hero)
    ).filter(TierList.id == tier_list_id).first()
    
    if not tier_list:
        raise HTTPException(status_code=404, detail="Tier list not found")
    
    return tier_list


@router.post("", response_model=TierListResponse, status_code=status.HTTP_201_CREATED)
def create_tier_list(
    tier_list: TierListCreate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Create a new tier list (Admin only)"""
    # Deactivate existing tier lists for this lane if creating an active one
    if tier_list.is_active:
        db.query(TierList).filter(
            TierList.lane == tier_list.lane.lower(),
            TierList.is_active == True
        ).update({"is_active": False})
    
    db_tier_list = TierList(
        lane=tier_list.lane.lower(),
        version=tier_list.version,
        is_active=tier_list.is_active
    )
    db.add(db_tier_list)
    db.flush()  # Get the ID
    
    # Add entries
    for entry in tier_list.entries or []:
        # Verify hero exists
        hero = db.query(Hero).filter(Hero.id == entry.hero_id).first()
        if not hero:
            continue
        
        db_entry = TierListEntry(
            tier_list_id=db_tier_list.id,
            hero_id=entry.hero_id,
            tier=entry.tier.upper(),
            notes=entry.notes
        )
        db.add(db_entry)
    
    db.commit()
    
    # Reload with relationships
    return db.query(TierList).options(
        joinedload(TierList.entries).joinedload(TierListEntry.hero)
    ).filter(TierList.id == db_tier_list.id).first()


@router.put("/{tier_list_id}", response_model=TierListResponse)
def update_tier_list(
    tier_list_id: int,
    tier_list: TierListUpdate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Update a tier list (Admin only)"""
    db_tier_list = db.query(TierList).filter(TierList.id == tier_list_id).first()
    if not db_tier_list:
        raise HTTPException(status_code=404, detail="Tier list not found")
    
    # Update basic fields
    if tier_list.lane is not None:
        db_tier_list.lane = tier_list.lane.lower()
    if tier_list.version is not None:
        db_tier_list.version = tier_list.version
    if tier_list.is_active is not None:
        if tier_list.is_active:
            # Deactivate other tier lists for this lane
            db.query(TierList).filter(
                TierList.lane == db_tier_list.lane,
                TierList.id != tier_list_id,
                TierList.is_active == True
            ).update({"is_active": False})
        db_tier_list.is_active = tier_list.is_active
    
    # Update entries if provided
    if tier_list.entries is not None:
        # Remove existing entries
        db.query(TierListEntry).filter(TierListEntry.tier_list_id == tier_list_id).delete()
        
        # Add new entries
        for entry in tier_list.entries:
            hero = db.query(Hero).filter(Hero.id == entry.hero_id).first()
            if not hero:
                continue
            
            db_entry = TierListEntry(
                tier_list_id=tier_list_id,
                hero_id=entry.hero_id,
                tier=entry.tier.upper(),
                notes=entry.notes
            )
            db.add(db_entry)
    
    db.commit()
    
    # Reload with relationships
    return db.query(TierList).options(
        joinedload(TierList.entries).joinedload(TierListEntry.hero)
    ).filter(TierList.id == tier_list_id).first()


@router.delete("/{tier_list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tier_list(
    tier_list_id: int,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Delete a tier list (Admin only)"""
    db_tier_list = db.query(TierList).filter(TierList.id == tier_list_id).first()
    if not db_tier_list:
        raise HTTPException(status_code=404, detail="Tier list not found")
    
    db.delete(db_tier_list)
    db.commit()
    return None


@router.post("/{tier_list_id}/entries", response_model=TierListResponse)
def add_tier_list_entry(
    tier_list_id: int,
    entry: TierListEntryCreate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Add a hero to a tier list (Admin only)"""
    db_tier_list = db.query(TierList).filter(TierList.id == tier_list_id).first()
    if not db_tier_list:
        raise HTTPException(status_code=404, detail="Tier list not found")
    
    # Check if hero already in tier list
    existing = db.query(TierListEntry).filter(
        TierListEntry.tier_list_id == tier_list_id,
        TierListEntry.hero_id == entry.hero_id
    ).first()
    
    if existing:
        # Update existing entry
        existing.tier = entry.tier.upper()
        existing.notes = entry.notes
    else:
        # Create new entry
        db_entry = TierListEntry(
            tier_list_id=tier_list_id,
            hero_id=entry.hero_id,
            tier=entry.tier.upper(),
            notes=entry.notes
        )
        db.add(db_entry)
    
    db.commit()
    
    # Reload with relationships
    return db.query(TierList).options(
        joinedload(TierList.entries).joinedload(TierListEntry.hero)
    ).filter(TierList.id == tier_list_id).first()
