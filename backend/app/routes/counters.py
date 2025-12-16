from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app.models import Counter, Hero
from app.schemas import CounterCreate, CounterResponse
from app.auth import get_current_admin

router = APIRouter(prefix="/api/counters", tags=["Counters"])


@router.get("", response_model=List[CounterResponse])
def get_all_counters(db: Session = Depends(get_db)):
    """Get all counter relationships"""
    counters = db.query(Counter).options(
        joinedload(Counter.hero),
        joinedload(Counter.countered_by)
    ).all()
    return counters


@router.get("/{hero_id}", response_model=List[CounterResponse])
def get_hero_counters(hero_id: int, db: Session = Depends(get_db)):
    """Get all heroes that counter a specific hero"""
    # Verify hero exists
    hero = db.query(Hero).filter(Hero.id == hero_id).first()
    if not hero:
        raise HTTPException(status_code=404, detail="Hero not found")
    
    counters = db.query(Counter).options(
        joinedload(Counter.hero),
        joinedload(Counter.countered_by)
    ).filter(Counter.hero_id == hero_id).all()
    
    return counters


@router.get("/by/{hero_id}", response_model=List[CounterResponse])
def get_heroes_countered_by(hero_id: int, db: Session = Depends(get_db)):
    """Get all heroes that a specific hero counters"""
    hero = db.query(Hero).filter(Hero.id == hero_id).first()
    if not hero:
        raise HTTPException(status_code=404, detail="Hero not found")
    
    counters = db.query(Counter).options(
        joinedload(Counter.hero),
        joinedload(Counter.countered_by)
    ).filter(Counter.countered_by_id == hero_id).all()
    
    return counters


@router.post("", response_model=CounterResponse, status_code=status.HTTP_201_CREATED)
def create_counter(
    counter: CounterCreate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Create a new counter relationship (Admin only)"""
    # Verify both heroes exist
    hero = db.query(Hero).filter(Hero.id == counter.hero_id).first()
    counter_hero = db.query(Hero).filter(Hero.id == counter.countered_by_id).first()
    
    if not hero:
        raise HTTPException(status_code=404, detail="Hero not found")
    if not counter_hero:
        raise HTTPException(status_code=404, detail="Counter hero not found")
    
    # Check if relationship already exists
    existing = db.query(Counter).filter(
        Counter.hero_id == counter.hero_id,
        Counter.countered_by_id == counter.countered_by_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Counter relationship already exists")
    
    db_counter = Counter(
        hero_id=counter.hero_id,
        countered_by_id=counter.countered_by_id,
        strength=counter.strength.lower(),
        explanation=counter.explanation
    )
    db.add(db_counter)
    db.commit()
    
    # Reload with relationships
    return db.query(Counter).options(
        joinedload(Counter.hero),
        joinedload(Counter.countered_by)
    ).filter(Counter.id == db_counter.id).first()


@router.put("/{counter_id}", response_model=CounterResponse)
def update_counter(
    counter_id: int,
    counter: CounterCreate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Update a counter relationship (Admin only)"""
    db_counter = db.query(Counter).filter(Counter.id == counter_id).first()
    if not db_counter:
        raise HTTPException(status_code=404, detail="Counter not found")
    
    db_counter.hero_id = counter.hero_id
    db_counter.countered_by_id = counter.countered_by_id
    db_counter.strength = counter.strength.lower()
    db_counter.explanation = counter.explanation
    
    db.commit()
    
    return db.query(Counter).options(
        joinedload(Counter.hero),
        joinedload(Counter.countered_by)
    ).filter(Counter.id == counter_id).first()


@router.delete("/{counter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_counter(
    counter_id: int,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Delete a counter relationship (Admin only)"""
    db_counter = db.query(Counter).filter(Counter.id == counter_id).first()
    if not db_counter:
        raise HTTPException(status_code=404, detail="Counter not found")
    
    db.delete(db_counter)
    db.commit()
    return None


@router.post("/bulk", response_model=List[CounterResponse], status_code=status.HTTP_201_CREATED)
def create_counters_bulk(
    counters: List[CounterCreate],
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Create multiple counter relationships at once (Admin only)"""
    created = []
    
    for counter in counters:
        # Skip if relationship exists
        existing = db.query(Counter).filter(
            Counter.hero_id == counter.hero_id,
            Counter.countered_by_id == counter.countered_by_id
        ).first()
        
        if existing:
            continue
        
        db_counter = Counter(
            hero_id=counter.hero_id,
            countered_by_id=counter.countered_by_id,
            strength=counter.strength.lower(),
            explanation=counter.explanation
        )
        db.add(db_counter)
        created.append(db_counter)
    
    db.commit()
    
    # Reload with relationships
    result = []
    for c in created:
        db.refresh(c)
        loaded = db.query(Counter).options(
            joinedload(Counter.hero),
            joinedload(Counter.countered_by)
        ).filter(Counter.id == c.id).first()
        result.append(loaded)
    
    return result
