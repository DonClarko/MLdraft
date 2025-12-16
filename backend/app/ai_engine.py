from typing import List, Dict, Tuple
from sqlalchemy.orm import Session
from app.models import Hero, TierList, TierListEntry, Counter, Synergy


class DraftAI:
    """AI system for draft recommendations"""
    
    # Tier score mapping
    TIER_SCORES = {
        "S": 5,
        "A": 4,
        "B": 3,
        "C": 2,
        "D": 1
    }
    
    # Counter strength bonuses
    COUNTER_BONUS = {
        "soft": 1.0,
        "medium": 2.0,
        "hard": 3.0
    }
    
    # Synergy strength bonuses
    SYNERGY_BONUS = {
        "weak": 0.5,
        "medium": 1.0,
        "strong": 2.0
    }
    
    # Role balance - ideal team composition
    IDEAL_ROLES = {
        "tank": 1,
        "fighter": 1,
        "assassin": 1,
        "mage": 1,
        "marksman": 1,
        "support": 0  # Optional, can replace with extra fighter/tank
    }
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_available_heroes(
        self, 
        bans: List[int], 
        blue_picks: List[int], 
        red_picks: List[int]
    ) -> List[Hero]:
        """Get heroes that are not banned or picked"""
        unavailable_ids = set(bans + blue_picks + red_picks)
        heroes = self.db.query(Hero).filter(~Hero.id.in_(unavailable_ids)).all()
        return heroes
    
    def get_hero_tier(self, hero: Hero) -> Tuple[str, float]:
        """Get the tier and score for a hero from active tier lists"""
        entry = self.db.query(TierListEntry).join(TierList).filter(
            TierListEntry.hero_id == hero.id,
            TierList.is_active == True,
            TierList.role == hero.role
        ).first()
        
        if entry:
            return entry.tier, self.TIER_SCORES.get(entry.tier, 2)
        return "C", 2  # Default to C tier if not in any tier list
    
    def get_counter_score(self, hero: Hero, enemy_picks: List[int]) -> Tuple[float, List[str]]:
        """Calculate counter score against enemy team"""
        score = 0
        reasons = []
        
        # Check if this hero counters any enemy picks
        counters = self.db.query(Counter).filter(
            Counter.countered_by_id == hero.id,
            Counter.hero_id.in_(enemy_picks)
        ).all()
        
        for counter in counters:
            bonus = self.COUNTER_BONUS.get(counter.strength, 1.0)
            score += bonus
            countered_hero = self.db.query(Hero).filter(Hero.id == counter.hero_id).first()
            if countered_hero:
                reasons.append(f"Counters {countered_hero.name} ({counter.strength})")
        
        # Check if enemy picks counter this hero (negative)
        countered_by = self.db.query(Counter).filter(
            Counter.hero_id == hero.id,
            Counter.countered_by_id.in_(enemy_picks)
        ).all()
        
        for counter in countered_by:
            penalty = self.COUNTER_BONUS.get(counter.strength, 1.0) * 0.5
            score -= penalty
            counter_hero = self.db.query(Hero).filter(Hero.id == counter.countered_by_id).first()
            if counter_hero:
                reasons.append(f"Countered by {counter_hero.name} ({counter.strength})")
        
        return score, reasons
    
    def get_synergy_score(self, hero: Hero, team_picks: List[int]) -> Tuple[float, List[str]]:
        """Calculate synergy score with team"""
        score = 0
        reasons = []
        
        if not team_picks:
            return score, reasons
        
        # Check synergies with team picks
        synergies = self.db.query(Synergy).filter(
            ((Synergy.hero_1_id == hero.id) & (Synergy.hero_2_id.in_(team_picks))) |
            ((Synergy.hero_2_id == hero.id) & (Synergy.hero_1_id.in_(team_picks)))
        ).all()
        
        for synergy in synergies:
            bonus = self.SYNERGY_BONUS.get(synergy.strength, 0.5)
            score += bonus
            
            # Find the teammate
            teammate_id = synergy.hero_2_id if synergy.hero_1_id == hero.id else synergy.hero_1_id
            teammate = self.db.query(Hero).filter(Hero.id == teammate_id).first()
            if teammate:
                reasons.append(f"Synergy with {teammate.name} ({synergy.strength})")
        
        return score, reasons
    
    def get_role_balance_score(self, hero: Hero, team_picks: List[int]) -> Tuple[float, List[str]]:
        """Calculate role balance score"""
        score = 0
        reasons = []
        
        # Count current team roles
        team_heroes = self.db.query(Hero).filter(Hero.id.in_(team_picks)).all() if team_picks else []
        role_counts = {role: 0 for role in self.IDEAL_ROLES.keys()}
        
        for h in team_heroes:
            if h.role in role_counts:
                role_counts[h.role] += 1
        
        hero_role = hero.role.lower() if hero.role else "fighter"
        
        # Check if this role is needed
        current_count = role_counts.get(hero_role, 0)
        ideal_count = self.IDEAL_ROLES.get(hero_role, 0)
        
        if current_count < ideal_count:
            score += 1.5
            reasons.append(f"Fills needed {hero_role} role")
        elif current_count == 0 and hero_role in ["tank", "marksman", "mage"]:
            score += 1.0
            reasons.append(f"Adds {hero_role} to team composition")
        elif current_count >= 2:
            score -= 0.5
            reasons.append(f"Team already has {current_count} {hero_role}(s)")
        
        return score, reasons
    
    def get_suggestions(
        self,
        bans: List[int],
        blue_picks: List[int],
        red_picks: List[int],
        current_team: str = "blue",
        top_n: int = 5
    ) -> List[Dict]:
        """Get top hero suggestions with scores and reasons"""
        
        team_picks = blue_picks if current_team == "blue" else red_picks
        enemy_picks = red_picks if current_team == "blue" else blue_picks
        
        available_heroes = self.get_available_heroes(bans, blue_picks, red_picks)
        
        suggestions = []
        
        for hero in available_heroes:
            reasons = []
            
            # 1. Tier score (base score)
            tier, tier_score = self.get_hero_tier(hero)
            reasons.append(f"Tier {tier} hero")
            
            # 2. Counter score
            counter_score, counter_reasons = self.get_counter_score(hero, enemy_picks)
            reasons.extend(counter_reasons)
            
            # 3. Synergy score
            synergy_score, synergy_reasons = self.get_synergy_score(hero, team_picks)
            reasons.extend(synergy_reasons)
            
            # 4. Role balance score
            role_score, role_reasons = self.get_role_balance_score(hero, team_picks)
            reasons.extend(role_reasons)
            
            # Calculate total score
            total_score = (
                tier_score * 1.0 +      # Base weight
                counter_score * 1.5 +   # Counter is important
                synergy_score * 1.2 +   # Synergy matters
                role_score * 0.8        # Role balance
            )
            
            suggestions.append({
                "hero": hero,
                "score": round(total_score, 2),
                "tier": tier,
                "reasons": reasons
            })
        
        # Sort by score descending
        suggestions.sort(key=lambda x: x["score"], reverse=True)
        
        return suggestions[:top_n]
    
    def analyze_team(self, team_picks: List[int]) -> Dict:
        """Analyze a team composition"""
        if not team_picks:
            return {
                "roles": {},
                "strengths": [],
                "weaknesses": [],
                "average_tier": "N/A"
            }
        
        heroes = self.db.query(Hero).filter(Hero.id.in_(team_picks)).all()
        
        # Count roles
        role_counts = {}
        tiers = []
        
        for hero in heroes:
            role = hero.role.lower() if hero.role else "unknown"
            role_counts[role] = role_counts.get(role, 0) + 1
            
            tier, _ = self.get_hero_tier(hero)
            tiers.append(tier)
        
        # Calculate strengths and weaknesses
        strengths = []
        weaknesses = []
        
        # Check role balance
        if role_counts.get("tank", 0) >= 1:
            strengths.append("Has frontline tank")
        else:
            weaknesses.append("No tank for frontline")
        
        if role_counts.get("marksman", 0) >= 1:
            strengths.append("Has sustained damage dealer")
        else:
            weaknesses.append("Lacks sustained damage")
        
        if role_counts.get("mage", 0) >= 1:
            strengths.append("Has magic damage")
        else:
            weaknesses.append("All physical damage")
        
        if role_counts.get("assassin", 0) >= 1:
            strengths.append("Has burst damage potential")
        
        # Check synergies within team
        synergy_count = 0
        for i, hero_id in enumerate(team_picks):
            for other_id in team_picks[i+1:]:
                synergy = self.db.query(Synergy).filter(
                    ((Synergy.hero_1_id == hero_id) & (Synergy.hero_2_id == other_id)) |
                    ((Synergy.hero_2_id == hero_id) & (Synergy.hero_1_id == other_id))
                ).first()
                if synergy:
                    synergy_count += 1
        
        if synergy_count >= 2:
            strengths.append(f"Good team synergy ({synergy_count} combos)")
        elif synergy_count == 0 and len(team_picks) >= 3:
            weaknesses.append("No known synergies")
        
        # Average tier
        tier_values = [self.TIER_SCORES.get(t, 2) for t in tiers]
        avg_tier_value = sum(tier_values) / len(tier_values) if tier_values else 2
        avg_tier = "S" if avg_tier_value >= 4.5 else "A" if avg_tier_value >= 3.5 else "B" if avg_tier_value >= 2.5 else "C"
        
        return {
            "roles": role_counts,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "average_tier": avg_tier,
            "synergy_count": synergy_count
        }
