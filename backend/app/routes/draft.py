from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json
from app.database import get_db
from app.models import Draft, Hero
from app.schemas import (
    DraftSuggestionRequest, 
    DraftSuggestionResponse, 
    DraftSuggestionGroups,
    HeroSuggestion,
    HeroResponse,
    DraftCreate,
    DraftResponse
)
from app.ai_engine import DraftAI

router = APIRouter(prefix="/api/draft", tags=["Draft"])


def build_hero_suggestion_payload(suggestion: dict) -> HeroSuggestion:
    hero = suggestion["hero"]
    return HeroSuggestion(
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
        score=suggestion["score"],
        tier=suggestion.get("tier"),
        lane_fit=suggestion.get("lane_fit"),
        reasons=suggestion.get("reasons", [])
    )


def build_standout_payload(suggestion: dict) -> dict:
    hero = suggestion["hero"]
    return {
        "hero": {
            "id": hero.id,
            "name": hero.name,
            "role": hero.role,
            "secondary_role": hero.secondary_role,
            "image_url": hero.image_url,
        },
        "score": suggestion.get("score"),
        "tier": suggestion.get("tier"),
        "lane_fit": suggestion.get("lane_fit"),
        "reasons": suggestion.get("reasons", []),
        "risks": suggestion.get("risks", []),
    }


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
    counter_suggestions = ai.get_counter_suggestions(
        bans=request.bans,
        blue_picks=request.blue_picks,
        red_picks=request.red_picks,
        current_team=request.current_team,
        top_n=3
    )
    synergy_suggestions = ai.get_synergy_suggestions(
        bans=request.bans,
        blue_picks=request.blue_picks,
        red_picks=request.red_picks,
        current_team=request.current_team,
        top_n=3
    )
    safe_suggestions = ai.get_safe_suggestions(
        bans=request.bans,
        blue_picks=request.blue_picks,
        red_picks=request.red_picks,
        current_team=request.current_team,
        top_n=3
    )
    avoid_suggestions = ai.get_avoid_suggestions(
        bans=request.bans,
        blue_picks=request.blue_picks,
        red_picks=request.red_picks,
        current_team=request.current_team,
        bottom_n=3
    )
    
    # Get team analysis
    team_picks = request.blue_picks if request.current_team == "blue" else request.red_picks
    enemy_picks = request.red_picks if request.current_team == "blue" else request.blue_picks
    
    team_analysis = ai.analyze_team(team_picks)
    enemy_analysis = ai.analyze_team(enemy_picks)
    
    # Format response
    hero_suggestions = [build_hero_suggestion_payload(suggestion) for suggestion in suggestions]
    counter_payload = [build_hero_suggestion_payload(suggestion) for suggestion in counter_suggestions]
    synergy_payload = [build_hero_suggestion_payload(suggestion) for suggestion in synergy_suggestions]
    safe_payload = [build_hero_suggestion_payload(suggestion) for suggestion in safe_suggestions]
    avoid_payload = [build_hero_suggestion_payload(suggestion) for suggestion in avoid_suggestions]
    
    return DraftSuggestionResponse(
        suggestions=hero_suggestions,
        suggestion_groups=DraftSuggestionGroups(
            counter=counter_payload,
            synergy=synergy_payload,
            safe=safe_payload,
        ),
        avoid_suggestions=avoid_payload,
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
    blue_standouts = [build_standout_payload(item) for item in ai.get_team_standouts(request.blue_picks, request.red_picks)]
    red_standouts = [build_standout_payload(item) for item in ai.get_team_standouts(request.red_picks, request.blue_picks)]
    
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

    winner = "blue" if blue_win_prob >= red_win_prob else "red"
    leading_team = blue_analysis if winner == "blue" else red_analysis
    trailing_team = red_analysis if winner == "blue" else blue_analysis
    edge = round(abs(blue_win_prob - red_win_prob), 1)

    summary_reasons = []
    if leading_team.get("synergy_count", 0) > trailing_team.get("synergy_count", 0):
        summary_reasons.append("Better combo and follow-up potential")
    if len(leading_team.get("strengths", [])) > len(trailing_team.get("strengths", [])):
        summary_reasons.append("More complete draft structure")
    if len(leading_team.get("weaknesses", [])) < len(trailing_team.get("weaknesses", [])):
        summary_reasons.append("Fewer exposed weaknesses")
    if leading_team.get("average_tier") != trailing_team.get("average_tier"):
        summary_reasons.append(f"Higher average tier: {leading_team.get('average_tier')}")

    verdict = {
        "winner": winner,
        "edge": edge,
        "win_probability": blue_win_prob if winner == "blue" else red_win_prob,
        "label": "Malinaw ang draft edge" if edge >= 12 else "May lamang sa draft" if edge >= 6 else "Halos dikit ang draft",
        "summary_reasons": summary_reasons[:3],
    }
    
    return {
        "blue_team": {
            **blue_analysis,
            "win_probability": blue_win_prob,
            "standout_picks": blue_standouts,
        },
        "red_team": {
            **red_analysis,
            "win_probability": red_win_prob,
            "standout_picks": red_standouts,
        },
        "verdict": verdict,
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
        winner=draft.winner,
        verdict=draft.verdict,
        analysis_summary=draft.analysis_summary,
        blue_win_probability=draft.blue_win_probability,
        red_win_probability=draft.red_win_probability,
        standout_picks=draft.standout_picks,
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
