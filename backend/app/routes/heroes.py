from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Hero
from app.schemas import HeroCreate, HeroUpdate, HeroResponse
from app.auth import get_current_admin

router = APIRouter(prefix="/api/heroes", tags=["Heroes"])


@router.get("", response_model=List[HeroResponse])
def get_heroes(
    role: Optional[str] = Query(None, description="Filter by role"),
    search: Optional[str] = Query(None, description="Search by name"),
    db: Session = Depends(get_db)
):
    """Get all heroes with optional filters"""
    query = db.query(Hero)
    
    if role:
        query = query.filter(Hero.role == role.lower())
    
    if search:
        query = query.filter(Hero.name.ilike(f"%{search}%"))
    
    heroes = query.order_by(Hero.name).all()
    return heroes


@router.get("/{hero_id}", response_model=HeroResponse)
def get_hero(hero_id: int, db: Session = Depends(get_db)):
    """Get a specific hero by ID"""
    hero = db.query(Hero).filter(Hero.id == hero_id).first()
    if not hero:
        raise HTTPException(status_code=404, detail="Hero not found")
    return hero


@router.post("", response_model=HeroResponse, status_code=status.HTTP_201_CREATED)
def create_hero(
    hero: HeroCreate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Create a new hero (Admin only)"""
    # Check if hero already exists
    existing = db.query(Hero).filter(Hero.name.ilike(hero.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Hero with this name already exists")
    
    db_hero = Hero(
        name=hero.name,
        role=hero.role.lower(),
        image_url=hero.image_url,
        specialty=hero.specialty,
        description=hero.description,
        skills=hero.skills
    )
    db.add(db_hero)
    db.commit()
    db.refresh(db_hero)
    return db_hero


@router.put("/{hero_id}", response_model=HeroResponse)
def update_hero(
    hero_id: int,
    hero: HeroUpdate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Update a hero (Admin only)"""
    db_hero = db.query(Hero).filter(Hero.id == hero_id).first()
    if not db_hero:
        raise HTTPException(status_code=404, detail="Hero not found")
    
    update_data = hero.model_dump(exclude_unset=True)
    if "role" in update_data and update_data["role"]:
        update_data["role"] = update_data["role"].lower()
    
    for field, value in update_data.items():
        setattr(db_hero, field, value)
    
    db.commit()
    db.refresh(db_hero)
    return db_hero


@router.delete("/{hero_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hero(
    hero_id: int,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Delete a hero (Admin only)"""
    db_hero = db.query(Hero).filter(Hero.id == hero_id).first()
    if not db_hero:
        raise HTTPException(status_code=404, detail="Hero not found")
    
    db.delete(db_hero)
    db.commit()
    return None


@router.post("/bulk", response_model=List[HeroResponse], status_code=status.HTTP_201_CREATED)
def create_heroes_bulk(
    heroes: List[HeroCreate],
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Create multiple heroes at once (Admin only)"""
    created_heroes = []
    for hero_data in heroes:
        existing = db.query(Hero).filter(Hero.name.ilike(hero_data.name)).first()
        if existing:
            continue  # Skip existing heroes
        
        db_hero = Hero(
            name=hero_data.name,
            role=hero_data.role.lower(),
            image_url=hero_data.image_url,
            specialty=hero_data.specialty,
            description=hero_data.description,
            skills=hero_data.skills
        )
        db.add(db_hero)
        created_heroes.append(db_hero)
    
    db.commit()
    for hero in created_heroes:
        db.refresh(hero)
    
    return created_heroes
