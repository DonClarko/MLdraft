from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json
from app.database import get_db
from app.models import Draft, Hero
from app.schemas import (
    DraftSuggestionRequest, 
    DraftSuggestionResponse, 
    HeroSuggestion,
    HeroResponse,
    DraftCreate,
    DraftResponse
)
from app.ai_engine import DraftAI

router = APIRouter(prefix="/api/draft", tags=["Draft"])


@router.post("/suggest", response_model=DraftSuggestionResponse)
def get_draft_suggestions(
    request: DraftSuggestionRequest,
    db: Session = Depends(get_db)
):
    """Get AI-powered hero suggestions for the draft"""
    ai = DraftAI(db)
    
    # Get suggestions
    suggestions = ai.get_suggestions(
        bans=request.bans,
        blue_picks=request.blue_picks,
        red_picks=request.red_picks,
        current_team=request.current_team,
        top_n=5
    )
    
    # Get team analysis
    team_picks = request.blue_picks if request.current_team == "blue" else request.red_picks
    enemy_picks = request.red_picks if request.current_team == "blue" else request.blue_picks
    
    team_analysis = ai.analyze_team(team_picks)
    enemy_analysis = ai.analyze_team(enemy_picks)
    
    # Format response
    hero_suggestions = []
    for s in suggestions:
        hero = s["hero"]
        hero_suggestions.append(HeroSuggestion(
            hero=HeroResponse(
                id=hero.id,
                name=hero.name,
                role=hero.role,
                image_url=hero.image_url,
                specialty=hero.specialty,
                description=hero.description,
                skills=hero.skills,
                created_at=hero.created_at,
                updated_at=hero.updated_at
            ),
            score=s["score"],
            tier=s["tier"],
            reasons=s["reasons"]
        ))
    
    return DraftSuggestionResponse(
        suggestions=hero_suggestions,
        team_analysis={
            "your_team": team_analysis,
            "enemy_team": enemy_analysis
        }
    )


@router.post("/analyze")
def analyze_draft(
    request: DraftSuggestionRequest,
    db: Session = Depends(get_db)
):
    """Analyze both team compositions"""
    ai = DraftAI(db)
    
    blue_analysis = ai.analyze_team(request.blue_picks)
    red_analysis = ai.analyze_team(request.red_picks)
    
    # Calculate win probability estimate (simplified)
    blue_score = 0
    red_score = 0
    
    # Factor in tier averages
    tier_scores = {"S": 5, "A": 4, "B": 3, "C": 2, "D": 1}
    blue_tier = tier_scores.get(blue_analysis.get("average_tier", "C"), 2)
    red_tier = tier_scores.get(red_analysis.get("average_tier", "C"), 2)
    blue_score += blue_tier * 10
    red_score += red_tier * 10
    
    # Factor in synergies
    blue_score += blue_analysis.get("synergy_count", 0) * 5
    red_score += red_analysis.get("synergy_count", 0) * 5
    
    # Factor in role balance
    blue_roles = blue_analysis.get("roles", {})
    red_roles = red_analysis.get("roles", {})
    
    for role in ["tank", "marksman", "mage"]:
        if blue_roles.get(role, 0) >= 1:
            blue_score += 3
        if red_roles.get(role, 0) >= 1:
            red_score += 3
    
    total = blue_score + red_score
    blue_win_prob = round((blue_score / total) * 100, 1) if total > 0 else 50
    red_win_prob = round(100 - blue_win_prob, 1)
    
    return {
        "blue_team": {
            **blue_analysis,
            "win_probability": blue_win_prob
        },
        "red_team": {
            **red_analysis,
            "win_probability": red_win_prob
        }
    }


@router.post("/save", response_model=DraftResponse, status_code=status.HTTP_201_CREATED)
def save_draft(
    draft: DraftCreate,
    db: Session = Depends(get_db)
):
    """Save a draft for history"""
    db_draft = Draft(
        blue_bans=draft.blue_bans,
        red_bans=draft.red_bans,
        blue_picks=draft.blue_picks,
        red_picks=draft.red_picks,
        winner=draft.winner
    )
    db.add(db_draft)
    db.commit()
    db.refresh(db_draft)
    return db_draft


@router.get("/history", response_model=List[DraftResponse])
def get_draft_history(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get recent draft history"""
    drafts = db.query(Draft).order_by(Draft.created_at.desc()).limit(limit).all()
    return drafts


@router.get("/available-heroes")
def get_available_heroes(
    bans: str = "",  # Comma-separated hero IDs
    blue_picks: str = "",
    red_picks: str = "",
    db: Session = Depends(get_db)
):
    """Get list of available heroes (not banned or picked)"""
    # Parse comma-separated IDs
    ban_ids = [int(x) for x in bans.split(",") if x.strip().isdigit()]
    blue_ids = [int(x) for x in blue_picks.split(",") if x.strip().isdigit()]
    red_ids = [int(x) for x in red_picks.split(",") if x.strip().isdigit()]
    
    unavailable = set(ban_ids + blue_ids + red_ids)
    
    if unavailable:
        heroes = db.query(Hero).filter(~Hero.id.in_(unavailable)).order_by(Hero.name).all()
    else:
        heroes = db.query(Hero).order_by(Hero.name).all()
    
    return [
        {
            "id": h.id,
            "name": h.name,
            "role": h.role,
            "image_url": h.image_url
        }
        for h in heroes
    ]
