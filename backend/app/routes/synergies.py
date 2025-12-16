from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app.models import Synergy, Hero
from app.schemas import SynergyCreate, SynergyResponse
from app.auth import get_current_admin

router = APIRouter(prefix="/api/synergies", tags=["Synergies"])


@router.get("", response_model=List[SynergyResponse])
def get_all_synergies(db: Session = Depends(get_db)):
    """Get all synergy relationships"""
    synergies = db.query(Synergy).options(
        joinedload(Synergy.hero_1),
        joinedload(Synergy.hero_2)
    ).all()
    return synergies


@router.get("/{hero_id}", response_model=List[SynergyResponse])
def get_hero_synergies(hero_id: int, db: Session = Depends(get_db)):
    """Get all synergies for a specific hero"""
    # Verify hero exists
    hero = db.query(Hero).filter(Hero.id == hero_id).first()
    if not hero:
        raise HTTPException(status_code=404, detail="Hero not found")
    
    synergies = db.query(Synergy).options(
        joinedload(Synergy.hero_1),
        joinedload(Synergy.hero_2)
    ).filter(
        (Synergy.hero_1_id == hero_id) | (Synergy.hero_2_id == hero_id)
    ).all()
    
    return synergies


@router.post("", response_model=SynergyResponse, status_code=status.HTTP_201_CREATED)
def create_synergy(
    synergy: SynergyCreate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Create a new synergy relationship (Admin only)"""
    # Verify both heroes exist
    hero1 = db.query(Hero).filter(Hero.id == synergy.hero_1_id).first()
    hero2 = db.query(Hero).filter(Hero.id == synergy.hero_2_id).first()
    
    if not hero1 or not hero2:
        raise HTTPException(status_code=404, detail="One or both heroes not found")
    
    if synergy.hero_1_id == synergy.hero_2_id:
        raise HTTPException(status_code=400, detail="Cannot create synergy with same hero")
    
    # Check if relationship already exists (in either direction)
    existing = db.query(Synergy).filter(
        ((Synergy.hero_1_id == synergy.hero_1_id) & (Synergy.hero_2_id == synergy.hero_2_id)) |
        ((Synergy.hero_1_id == synergy.hero_2_id) & (Synergy.hero_2_id == synergy.hero_1_id))
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Synergy relationship already exists")
    
    db_synergy = Synergy(
        hero_1_id=synergy.hero_1_id,
        hero_2_id=synergy.hero_2_id,
        strength=synergy.strength.lower(),
        explanation=synergy.explanation
    )
    db.add(db_synergy)
    db.commit()
    
    # Reload with relationships
    return db.query(Synergy).options(
        joinedload(Synergy.hero_1),
        joinedload(Synergy.hero_2)
    ).filter(Synergy.id == db_synergy.id).first()


@router.put("/{synergy_id}", response_model=SynergyResponse)
def update_synergy(
    synergy_id: int,
    synergy: SynergyCreate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Update a synergy relationship (Admin only)"""
    db_synergy = db.query(Synergy).filter(Synergy.id == synergy_id).first()
    if not db_synergy:
        raise HTTPException(status_code=404, detail="Synergy not found")
    
    db_synergy.hero_1_id = synergy.hero_1_id
    db_synergy.hero_2_id = synergy.hero_2_id
    db_synergy.strength = synergy.strength.lower()
    db_synergy.explanation = synergy.explanation
    
    db.commit()
    
    return db.query(Synergy).options(
        joinedload(Synergy.hero_1),
        joinedload(Synergy.hero_2)
    ).filter(Synergy.id == synergy_id).first()


@router.delete("/{synergy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_synergy(
    synergy_id: int,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Delete a synergy relationship (Admin only)"""
    db_synergy = db.query(Synergy).filter(Synergy.id == synergy_id).first()
    if not db_synergy:
        raise HTTPException(status_code=404, detail="Synergy not found")
    
    db.delete(db_synergy)
    db.commit()
    return None


@router.post("/bulk", response_model=List[SynergyResponse], status_code=status.HTTP_201_CREATED)
def create_synergies_bulk(
    synergies: List[SynergyCreate],
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Create multiple synergy relationships at once (Admin only)"""
    created = []
    
    for synergy in synergies:
        # Skip if same hero or relationship exists
        if synergy.hero_1_id == synergy.hero_2_id:
            continue
            
        existing = db.query(Synergy).filter(
            ((Synergy.hero_1_id == synergy.hero_1_id) & (Synergy.hero_2_id == synergy.hero_2_id)) |
            ((Synergy.hero_1_id == synergy.hero_2_id) & (Synergy.hero_2_id == synergy.hero_1_id))
        ).first()
        
        if existing:
            continue
        
        db_synergy = Synergy(
            hero_1_id=synergy.hero_1_id,
            hero_2_id=synergy.hero_2_id,
            strength=synergy.strength.lower(),
            explanation=synergy.explanation
        )
        db.add(db_synergy)
        created.append(db_synergy)
    
    db.commit()
    
    # Reload with relationships
    result = []
    for s in created:
        db.refresh(s)
        loaded = db.query(Synergy).options(
            joinedload(Synergy.hero_1),
            joinedload(Synergy.hero_2)
        ).filter(Synergy.id == s.id).first()
        result.append(loaded)
    
    return result
