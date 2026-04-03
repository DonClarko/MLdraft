from __future__ import annotations

import json
import re
from typing import Dict, List, Set, Tuple

from sqlalchemy.orm import Session

from app.models import Counter, Hero, Synergy, TierList, TierListEntry


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

    TRAIT_KEYWORDS = {
        "crowd_control": ["stun", "immobil", "knock", "airborne", "taunt", "freeze", "suppression", "paraly", "pull", "push", "silence", "slow"],
        "mobility": ["dash", "blink", "leap", "charge", "movement speed", "conceal", "untargetable"],
        "anti_mobility": ["cannot use displacement", "prevents", "immobil", "suppression", "pull", "knock", "slow"],
        "burst": ["burst", "finisher", "execute", "high damage", "true damage"],
        "aoe": ["aoe", "area", "nearby enemies", "all enemies", "in the area", "within range"],
        "poke": ["poke", "target direction", "projectile", "long range", "ranged"],
        "sustain": ["regen", "recover", "heal", "heals", "healing", "lifesteal", "spell vamp", "shield"],
        "protect": ["shield", "heal", "heals", "guard", "protect", "remove all debuffs", "control immunity", "immune"],
        "engage": ["dash", "blink", "charge", "launches", "pull", "knock up", "initiator"],
        "anti_tank": ["max hp", "true damage", "physical defense reduced", "magic defense reduced", "armor reduction", "percent damage"],
    }

    SPECIALTY_TRAITS = {
        "crowd control": {"crowd_control", "anti_mobility"},
        "initiator": {"engage", "frontline"},
        "mobility": {"mobility", "dive"},
        "chase": {"mobility", "dive"},
        "burst": {"burst"},
        "poke": {"poke"},
        "regen": {"sustain", "frontline"},
        "guard": {"protect", "support"},
        "support": {"support", "protect"},
        "heal": {"support", "sustain", "protect"},
        "damage": {"sustained_damage"},
        "counter-mobility": {"anti_mobility", "crowd_control"},
    }

    LANE_PREFERENCES = {
        "tank": ["Roam", "EXP"],
        "fighter": ["EXP", "Gold"],
        "assassin": ["Jungle", "Mid"],
        "mage": ["Mid", "Gold"],
        "marksman": ["Gold"],
        "support": ["Roam"],
    }

    TIER_LIST_LANE_MAP = {
        "Gold": "gold_lane",
        "EXP": "exp_lane",
        "Mid": "mid_lane",
        "Jungle": "jungle",
        "Roam": "roamer",
    }
    
    def __init__(self, db: Session):
        self.db = db
        self._skill_cache: Dict[int, dict] = {}
        self._trait_cache: Dict[int, Set[str]] = {}
        self._hero_map: Dict[int, Hero] = {}
        self._tier_entry_cache: Dict[int, List[TierListEntry]] = {}

    def _get_heroes(self, hero_ids: List[int]) -> List[Hero]:
        if not hero_ids:
            return []

        missing_ids = [hero_id for hero_id in hero_ids if hero_id not in self._hero_map]
        if missing_ids:
            heroes = self.db.query(Hero).filter(Hero.id.in_(missing_ids)).all()
            for hero in heroes:
                self._hero_map[hero.id] = hero

        return [self._hero_map[hero_id] for hero_id in hero_ids if hero_id in self._hero_map]

    def _parse_skills(self, hero: Hero) -> dict:
        if hero.id in self._skill_cache:
            return self._skill_cache[hero.id]

        payload = {}
        if hero.skills:
            try:
                payload = json.loads(hero.skills)
            except json.JSONDecodeError:
                payload = {}

        self._skill_cache[hero.id] = payload
        return payload

    def _hero_text_blob(self, hero: Hero) -> str:
        payload = self._parse_skills(hero)
        text_parts = [hero.name or "", hero.role or "", hero.secondary_role or "", hero.specialty or "", hero.description or ""]

        for ability in payload.get("abilities", []):
            text_parts.extend([
                ability.get("section", ""),
                ability.get("name", ""),
                ability.get("description", ""),
                " ".join(ability.get("labels", [])),
            ])

        return " ".join(text_parts).lower()

    def get_hero_traits(self, hero: Hero) -> Set[str]:
        if hero.id in self._trait_cache:
            return self._trait_cache[hero.id]

        traits: Set[str] = set()
        role = (hero.role or "").lower()
        secondary_role = (hero.secondary_role or "").lower()
        specialty = (hero.specialty or "").lower()
        text_blob = self._hero_text_blob(hero)

        if role == "tank":
            traits.update({"frontline", "engage", "crowd_control"})
        elif role == "fighter":
            traits.update({"frontline", "dive", "sustained_damage"})
        elif role == "assassin":
            traits.update({"burst", "mobility", "dive"})
        elif role == "mage":
            traits.update({"burst", "aoe", "backline_carry"})
        elif role == "marksman":
            traits.update({"backline_carry", "sustained_damage"})
        elif role == "support":
            traits.update({"support", "protect"})

        if secondary_role == "support":
            traits.update({"support", "protect"})
        if secondary_role == "tank":
            traits.update({"frontline", "engage"})
        if secondary_role == "assassin":
            traits.update({"mobility", "dive"})
        if secondary_role == "mage":
            traits.add("burst")
        if secondary_role == "marksman":
            traits.add("backline_carry")

        for phrase, phrase_traits in self.SPECIALTY_TRAITS.items():
            if phrase in specialty:
                traits.update(phrase_traits)

        for trait, keywords in self.TRAIT_KEYWORDS.items():
            if any(keyword in text_blob for keyword in keywords):
                traits.add(trait)

        if "basic attack" in text_blob or role == "marksman":
            traits.add("sustained_damage")
        if role in {"fighter", "tank", "support"}:
            traits.add("short_range")
        if role in {"mage", "marksman"}:
            traits.add("ranged")
        if "shield" in text_blob or "heal" in text_blob or "control immunity" in text_blob:
            traits.add("protect")
        if "dash" in text_blob and "burst" in traits:
            traits.add("dive")
        if "frontline" in traits and "support" in traits:
            traits.add("protect")

        self._trait_cache[hero.id] = traits
        return traits

    def _push_reason(self, reason_map: Dict[str, float], reason: str, value: float) -> None:
        current = reason_map.get(reason)
        if current is None or abs(value) > abs(current):
            reason_map[reason] = value

    def _pair_skill_synergy(self, hero: Hero, ally: Hero) -> Tuple[float, Dict[str, float]]:
        hero_traits = self.get_hero_traits(hero)
        ally_traits = self.get_hero_traits(ally)
        score = 0.0
        reasons: Dict[str, float] = {}

        if "engage" in ally_traits and ({"burst", "aoe", "poke"} & hero_traits):
            score += 0.9
            self._push_reason(reasons, f"Can follow {ally.name}'s engage", 0.9)
        if "crowd_control" in ally_traits and ({"burst", "aoe", "poke"} & hero_traits):
            score += 0.8
            self._push_reason(reasons, f"Can capitalize on {ally.name}'s crowd control", 0.8)
        if "frontline" in ally_traits and ({"backline_carry", "poke"} & hero_traits):
            score += 0.7
            self._push_reason(reasons, f"Gets cover from {ally.name}'s frontline", 0.7)
        if "support" in ally_traits and ({"dive", "backline_carry"} & hero_traits):
            score += 0.6
            self._push_reason(reasons, f"Benefits from {ally.name}'s support tools", 0.6)
        if "support" in hero_traits and ({"dive", "backline_carry"} & ally_traits):
            score += 0.6
            self._push_reason(reasons, f"Supports {ally.name}'s win condition", 0.6)
        if "dive" in hero_traits and "dive" in ally_traits:
            score += 0.4
            self._push_reason(reasons, f"Can dive together with {ally.name}", 0.4)

        return score, reasons

    def _pair_skill_counter(self, hero: Hero, enemy: Hero) -> Tuple[float, Dict[str, float]]:
        hero_traits = self.get_hero_traits(hero)
        enemy_traits = self.get_hero_traits(enemy)
        score = 0.0
        reasons: Dict[str, float] = {}

        if "mobility" in enemy_traits and ({"anti_mobility", "crowd_control"} & hero_traits):
            score += 0.9
            self._push_reason(reasons, f"Can punish {enemy.name}'s mobility", 0.9)
        if "backline_carry" in enemy_traits and ({"dive", "burst"} & hero_traits):
            score += 0.8
            self._push_reason(reasons, f"Can pressure {enemy.name}", 0.8)
        if "frontline" in enemy_traits and ({"anti_tank", "sustained_damage"} & hero_traits):
            score += 0.7
            self._push_reason(reasons, f"Has tools into {enemy.name}'s frontline", 0.7)
        if "sustain" in enemy_traits and "burst" in hero_traits:
            score += 0.3
            self._push_reason(reasons, f"Can cut through {enemy.name}'s sustain windows", 0.3)

        if "anti_mobility" in enemy_traits and "mobility" in hero_traits:
            score -= 0.9
            self._push_reason(reasons, f"Risky into {enemy.name}'s anti-mobility", -0.9)
        if "crowd_control" in enemy_traits and "dive" in hero_traits and "protect" not in hero_traits:
            score -= 0.6
            self._push_reason(reasons, f"Can get stopped by {enemy.name}'s control", -0.6)
        if "dive" in enemy_traits and "backline_carry" in hero_traits and "frontline" not in hero_traits and "protect" not in hero_traits:
            score -= 0.7
            self._push_reason(reasons, f"Unsafe pick into {enemy.name}'s dive", -0.7)

        return score, reasons
    
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
    
    def _get_lane_preferences(self, hero: Hero, team_picks: List[int]) -> List[str]:
        role = (hero.role or "").lower()
        preferences = list(self.LANE_PREFERENCES.get(role, []))

        secondary_role = (hero.secondary_role or "").lower()
        for lane in self.LANE_PREFERENCES.get(secondary_role, []):
            if lane not in preferences:
                preferences.append(lane)

        if not preferences:
            return []

        preferred_lane = preferences[0]
        team_roles = [picked_hero.role.lower() for picked_hero in self._get_heroes(team_picks) if picked_hero.role]

        if role == "marksman" and "marksman" in team_roles:
            preferred_lane = preferences[-1]
        elif role == "mage" and "mage" in team_roles and len(preferences) > 1:
            preferred_lane = preferences[-1]
        elif role == "tank" and "tank" in team_roles and len(preferences) > 1:
            preferred_lane = preferences[-1]

        ordered = [preferred_lane]
        ordered.extend([lane for lane in preferences if lane != preferred_lane])
        return ordered

    def _get_active_tier_entries(self, hero: Hero) -> List[TierListEntry]:
        if hero.id in self._tier_entry_cache:
            return self._tier_entry_cache[hero.id]

        entries = self.db.query(TierListEntry).join(TierList).filter(
            TierListEntry.hero_id == hero.id,
            TierList.is_active == True
        ).all()
        self._tier_entry_cache[hero.id] = entries
        return entries

    def get_hero_tier_context(self, hero: Hero, team_picks: List[int] | None = None) -> Dict[str, object]:
        entries = self._get_active_tier_entries(hero)
        preferred_lanes = self._get_lane_preferences(hero, team_picks or [])
        preferred_lane_codes = [self.TIER_LIST_LANE_MAP[lane] for lane in preferred_lanes if lane in self.TIER_LIST_LANE_MAP]

        if not entries:
            return {
                "tier": "C",
                "score": 2.0,
                "reasons": [],
                "lane": None,
                "notes": None,
                "version": None,
            }

        entry_by_lane = {entry.tier_list.lane: entry for entry in entries}
        selected_entry = None
        lane_bonus = 0.0
        lane_label = None

        for index, lane_code in enumerate(preferred_lane_codes):
            entry = entry_by_lane.get(lane_code)
            if entry:
                selected_entry = entry
                lane_bonus = 0.8 if index == 0 else 0.4
                lane_label = preferred_lanes[index]
                break

        if selected_entry is None:
            selected_entry = max(entries, key=lambda entry: self.TIER_SCORES.get(entry.tier, 2))
            lane_label = next(
                (label for label, code in self.TIER_LIST_LANE_MAP.items() if code == selected_entry.tier_list.lane),
                selected_entry.tier_list.lane,
            )

        base_score = float(self.TIER_SCORES.get(selected_entry.tier, 2))
        reasons = [f"Your active {lane_label} tier list rates this hero {selected_entry.tier}-tier"]
        if selected_entry.notes:
            reasons.append(selected_entry.notes.strip())

        return {
            "tier": selected_entry.tier,
            "score": round(base_score + lane_bonus, 2),
            "reasons": reasons[:2],
            "lane": lane_label,
            "notes": selected_entry.notes,
            "version": selected_entry.tier_list.version,
        }

    def get_hero_tier(self, hero: Hero) -> Tuple[str, float]:
        """Get the tier and score for a hero from active tier lists"""
        tier_context = self.get_hero_tier_context(hero)
        return str(tier_context["tier"]), float(tier_context["score"])
    
    def get_counter_score(self, hero: Hero, enemy_picks: List[int]) -> Tuple[float, List[str]]:
        """Calculate counter score against enemy team"""
        score = 0
        reasons = []
        enemy_heroes = self._get_heroes(enemy_picks)
        enemy_map = {enemy.id: enemy for enemy in enemy_heroes}
        
        # Check if this hero counters any enemy picks
        counters = self.db.query(Counter).filter(
            Counter.countered_by_id == hero.id,
            Counter.hero_id.in_(enemy_picks)
        ).all()
        
        for counter in counters:
            bonus = self.COUNTER_BONUS.get(counter.strength, 1.0)
            score += bonus
            countered_hero = enemy_map.get(counter.hero_id)
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
            counter_hero = enemy_map.get(counter.countered_by_id)
            if counter_hero:
                reasons.append(f"Countered by {counter_hero.name} ({counter.strength})")
        
        return score, reasons
    
    def get_synergy_score(self, hero: Hero, team_picks: List[int]) -> Tuple[float, List[str]]:
        """Calculate synergy score with team"""
        score = 0
        reasons = []
        
        if not team_picks:
            return score, reasons

        team_heroes = self._get_heroes(team_picks)
        team_map = {ally.id: ally for ally in team_heroes}
        
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
            teammate = team_map.get(teammate_id)
            if teammate:
                reasons.append(f"Synergy with {teammate.name} ({synergy.strength})")
        
        return score, reasons

    def get_skill_counter_score(self, hero: Hero, enemy_picks: List[int]) -> Tuple[float, List[str]]:
        score = 0.0
        reason_scores: Dict[str, float] = {}

        for enemy in self._get_heroes(enemy_picks):
            pair_score, pair_reasons = self._pair_skill_counter(hero, enemy)
            score += pair_score
            for reason, value in pair_reasons.items():
                self._push_reason(reason_scores, reason, value)

        ordered = sorted(reason_scores.items(), key=lambda item: abs(item[1]), reverse=True)
        return score, [reason for reason, _ in ordered[:3]]

    def get_skill_synergy_score(self, hero: Hero, team_picks: List[int]) -> Tuple[float, List[str]]:
        score = 0.0
        reason_scores: Dict[str, float] = {}

        for ally in self._get_heroes(team_picks):
            pair_score, pair_reasons = self._pair_skill_synergy(hero, ally)
            score += pair_score
            for reason, value in pair_reasons.items():
                self._push_reason(reason_scores, reason, value)

        ordered = sorted(reason_scores.items(), key=lambda item: abs(item[1]), reverse=True)
        return score, [reason for reason, _ in ordered[:3]]
    
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

    def get_lane_fit(self, hero: Hero, team_picks: List[int]) -> str | None:
        preferences = self._get_lane_preferences(hero, team_picks)
        return preferences[0] if preferences else None

    def get_safety_score(self, hero: Hero, team_picks: List[int], enemy_picks: List[int]) -> Tuple[float, List[str], List[str]]:
        hero_traits = self.get_hero_traits(hero)
        team_heroes = self._get_heroes(team_picks)
        enemy_heroes = self._get_heroes(enemy_picks)
        team_trait_counts: Dict[str, int] = {}
        enemy_trait_counts: Dict[str, int] = {}

        for picked_hero in team_heroes:
            for trait in self.get_hero_traits(picked_hero):
                team_trait_counts[trait] = team_trait_counts.get(trait, 0) + 1

        for picked_hero in enemy_heroes:
            for trait in self.get_hero_traits(picked_hero):
                enemy_trait_counts[trait] = enemy_trait_counts.get(trait, 0) + 1

        role_counts: Dict[str, int] = {}
        for picked_hero in team_heroes:
            role_name = (picked_hero.role or "").lower()
            if role_name:
                role_counts[role_name] = role_counts.get(role_name, 0) + 1

        role = (hero.role or "").lower()
        score = 0.0
        positive_reasons: List[str] = []
        negative_reasons: List[str] = []

        if "frontline" in hero_traits and team_trait_counts.get("frontline", 0) == 0:
            score += 1.2
            positive_reasons.append("Stabilizes your frontline")
        if "protect" in hero_traits and team_trait_counts.get("backline_carry", 0) >= 1:
            score += 1.0
            positive_reasons.append("Can keep your carry safer")
        if "ranged" in hero_traits and ({"protect", "poke", "mobility"} & hero_traits):
            score += 0.6
            positive_reasons.append("Reliable blind-pick profile")
        if "crowd_control" in hero_traits and team_trait_counts.get("crowd_control", 0) == 0:
            score += 0.5
            positive_reasons.append("Adds dependable control")
        if role and role_counts.get(role, 0) == 0 and role in {"tank", "marksman", "mage", "support"}:
            score += 0.4
            positive_reasons.append(f"Rounds out your {role} slot")

        if enemy_trait_counts.get("dive", 0) >= 1 and "backline_carry" in hero_traits and "protect" not in hero_traits and "mobility" not in hero_traits:
            score -= 1.1
            negative_reasons.append("Unsafe backliner into enemy dive")
        if enemy_trait_counts.get("anti_mobility", 0) >= 1 and "mobility" in hero_traits:
            score -= 0.8
            negative_reasons.append("Can get punished by enemy anti-mobility")
        if role and role_counts.get(role, 0) >= 2:
            score -= 0.8
            negative_reasons.append(f"Overloads your draft with another {role}")
        if "backline_carry" in hero_traits and team_trait_counts.get("frontline", 0) == 0 and "protect" not in hero_traits:
            score -= 0.6
            negative_reasons.append("Needs frontline cover first")
        if role == "marksman" and role_counts.get("marksman", 0) >= 1:
            score -= 0.9
            negative_reasons.append("Double marksman is risky here")
        if role == "mage" and role_counts.get("mage", 0) >= 1 and team_trait_counts.get("frontline", 0) == 0:
            score -= 0.4
            negative_reasons.append("Another mage leaves the draft fragile")

        return score, positive_reasons[:3], negative_reasons[:4]

    def get_global_winrate_score(self, hero: Hero) -> Tuple[float, List[str]]:
        if hero.global_rg_win_rate is None:
            return 0.0, []

        win_rate = float(hero.global_rg_win_rate)
        score = 0.0

        if win_rate >= 56:
            score = 1.5
        elif win_rate >= 54:
            score = 1.1
        elif win_rate >= 52:
            score = 0.7
        elif win_rate <= 47:
            score = -0.8
        elif win_rate <= 49:
            score = -0.3

        source = f" from {hero.global_rg_source}" if hero.global_rg_source else ""
        reason = f"High global RG win rate{source}: {win_rate:.1f}%" if score >= 0 else f"Low global RG win rate{source}: {win_rate:.1f}%"
        return score, [reason]

    def _dedupe_reasons(self, reasons: List[str], limit: int) -> List[str]:
        unique_reasons: List[str] = []
        for reason in reasons:
            if reason not in unique_reasons:
                unique_reasons.append(reason)
            if len(unique_reasons) >= limit:
                break
        return unique_reasons

    def _build_category_suggestions(
        self,
        suggestions: List[Dict],
        metric_key: str,
        top_n: int,
        primary_reason_key: str,
        fallback_reason_keys: List[str],
        reverse: bool = True,
    ) -> List[Dict]:
        ordered = sorted(suggestions, key=lambda item: item["breakdown"].get(metric_key, 0), reverse=reverse)
        picks: List[Dict] = []

        for suggestion in ordered:
            category_reasons = suggestion["category_reasons"]
            reasons = list(category_reasons.get(primary_reason_key, []))
            for fallback_key in fallback_reason_keys:
                reasons.extend(category_reasons.get(fallback_key, []))

            picks.append({
                **suggestion,
                "reasons": self._dedupe_reasons(reasons, 4),
            })

            if len(picks) >= top_n:
                break

        return picks

    def _score_heroes(
        self,
        bans: List[int],
        blue_picks: List[int],
        red_picks: List[int],
        current_team: str = "blue",
    ) -> List[Dict]:
        team_picks = blue_picks if current_team == "blue" else red_picks
        enemy_picks = red_picks if current_team == "blue" else blue_picks

        available_heroes = self.get_available_heroes(bans, blue_picks, red_picks)
        suggestions = []

        for hero in available_heroes:
            lane_fit = self.get_lane_fit(hero, team_picks)
            tier_context = self.get_hero_tier_context(hero, team_picks)
            tier = str(tier_context["tier"])
            tier_score = float(tier_context["score"])
            tier_reasons = self._dedupe_reasons(list(tier_context["reasons"]), 2) or [f"Tier {tier} hero"]

            counter_score, counter_reasons = self.get_counter_score(hero, enemy_picks)
            synergy_score, synergy_reasons = self.get_synergy_score(hero, team_picks)
            role_score, role_reasons = self.get_role_balance_score(hero, team_picks)
            skill_counter_score, skill_counter_reasons = self.get_skill_counter_score(hero, enemy_picks)
            skill_synergy_score, skill_synergy_reasons = self.get_skill_synergy_score(hero, team_picks)

            safety_score, safe_reasons, negative_reasons = self.get_safety_score(hero, team_picks, enemy_picks)
            winrate_score, winrate_reasons = self.get_global_winrate_score(hero)

            counter_component = counter_score * 1.5 + skill_counter_score * 1.1
            synergy_component = synergy_score * 1.2 + skill_synergy_score * 1.0
            role_component = role_score * 0.8
            safe_component = safety_score

            total_score = (
                tier_score * 1.0 +
                counter_component +
                synergy_component +
                role_component +
                safe_component +
                winrate_score
            )

            overall_reasons = self._dedupe_reasons(
                tier_reasons + winrate_reasons + counter_reasons + skill_counter_reasons + synergy_reasons + skill_synergy_reasons + role_reasons + safe_reasons + negative_reasons,
                6,
            )

            suggestions.append({
                "hero": hero,
                "score": round(total_score, 2),
                "tier": tier,
                "lane_fit": lane_fit,
                "reasons": overall_reasons,
                "breakdown": {
                    "overall": round(total_score, 2),
                    "counter": round(counter_component, 2),
                    "synergy": round(synergy_component, 2),
                    "safe": round(tier_score * 0.7 + role_component + safe_component + winrate_score, 2),
                },
                "category_reasons": {
                    "overall": overall_reasons,
                    "tier": self._dedupe_reasons(tier_reasons + winrate_reasons, 3),
                    "counter": self._dedupe_reasons(counter_reasons + skill_counter_reasons, 4),
                    "synergy": self._dedupe_reasons(synergy_reasons + skill_synergy_reasons, 4),
                    "safe": self._dedupe_reasons(safe_reasons + role_reasons + tier_reasons + winrate_reasons, 4),
                    "negative": self._dedupe_reasons(negative_reasons, 4),
                }
            })

        return suggestions
    
    def get_suggestions(
        self,
        bans: List[int],
        blue_picks: List[int],
        red_picks: List[int],
        current_team: str = "blue",
        top_n: int = 5
    ) -> List[Dict]:
        """Get top hero suggestions with scores and reasons"""
        suggestions = self._score_heroes(bans, blue_picks, red_picks, current_team)
        suggestions.sort(key=lambda x: x["score"], reverse=True)

        return suggestions[:top_n]

    def get_counter_suggestions(
        self,
        bans: List[int],
        blue_picks: List[int],
        red_picks: List[int],
        current_team: str = "blue",
        top_n: int = 3
    ) -> List[Dict]:
        suggestions = self._score_heroes(bans, blue_picks, red_picks, current_team)
        return self._build_category_suggestions(suggestions, "counter", top_n, "counter", ["safe", "tier"])

    def get_synergy_suggestions(
        self,
        bans: List[int],
        blue_picks: List[int],
        red_picks: List[int],
        current_team: str = "blue",
        top_n: int = 3
    ) -> List[Dict]:
        suggestions = self._score_heroes(bans, blue_picks, red_picks, current_team)
        return self._build_category_suggestions(suggestions, "synergy", top_n, "synergy", ["safe", "tier"])

    def get_safe_suggestions(
        self,
        bans: List[int],
        blue_picks: List[int],
        red_picks: List[int],
        current_team: str = "blue",
        top_n: int = 3
    ) -> List[Dict]:
        suggestions = self._score_heroes(bans, blue_picks, red_picks, current_team)
        return self._build_category_suggestions(suggestions, "safe", top_n, "safe", ["tier", "synergy"])

    def get_avoid_suggestions(
        self,
        bans: List[int],
        blue_picks: List[int],
        red_picks: List[int],
        current_team: str = "blue",
        bottom_n: int = 3
    ) -> List[Dict]:
        suggestions = self._score_heroes(bans, blue_picks, red_picks, current_team)
        suggestions.sort(key=lambda x: (x["breakdown"].get("safe", 0), x["score"]))

        avoid = []
        for suggestion in suggestions:
            negative_reasons = suggestion["category_reasons"].get("negative", [])

            avoid.append({
                **suggestion,
                "reasons": negative_reasons[:4] or suggestion["reasons"][:3]
            })

            if len(avoid) >= bottom_n:
                break

        return avoid
    
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
        derived_combo_count = 0
        for i, hero_id in enumerate(team_picks):
            for other_id in team_picks[i+1:]:
                synergy = self.db.query(Synergy).filter(
                    ((Synergy.hero_1_id == hero_id) & (Synergy.hero_2_id == other_id)) |
                    ((Synergy.hero_2_id == hero_id) & (Synergy.hero_1_id == other_id))
                ).first()
                if synergy:
                    synergy_count += 1

                hero = next((item for item in heroes if item.id == hero_id), None)
                other = next((item for item in heroes if item.id == other_id), None)
                if hero and other:
                    derived_score, _ = self._pair_skill_synergy(hero, other)
                    if derived_score >= 0.8:
                        derived_combo_count += 1
        
        if synergy_count >= 2 or derived_combo_count >= 2:
            strengths.append(f"Good team synergy ({synergy_count + derived_combo_count} combos)")
        elif synergy_count == 0 and derived_combo_count == 0 and len(team_picks) >= 3:
            weaknesses.append("No strong follow-up synergy yet")

        trait_counts: Dict[str, int] = {}
        for hero in heroes:
            for trait in self.get_hero_traits(hero):
                trait_counts[trait] = trait_counts.get(trait, 0) + 1

        if trait_counts.get("crowd_control", 0) >= 1:
            strengths.append("Has reliable crowd control")
        else:
            weaknesses.append("Limited crowd control")

        if trait_counts.get("frontline", 0) >= 1 and trait_counts.get("backline_carry", 0) >= 1:
            strengths.append("Front-to-back teamfight structure")
        elif trait_counts.get("backline_carry", 0) >= 2 and trait_counts.get("frontline", 0) == 0:
            weaknesses.append("Backline may be exposed")

        if trait_counts.get("protect", 0) >= 1 and trait_counts.get("backline_carry", 0) >= 1:
            strengths.append("Can protect damage dealers")

        if trait_counts.get("engage", 0) == 0 and len(team_picks) >= 3:
            weaknesses.append("Lacks strong engage tools")
        
        # Average tier
        tier_values = [self.TIER_SCORES.get(t, 2) for t in tiers]
        avg_tier_value = sum(tier_values) / len(tier_values) if tier_values else 2
        avg_tier = "S" if avg_tier_value >= 4.5 else "A" if avg_tier_value >= 3.5 else "B" if avg_tier_value >= 2.5 else "C"
        
        return {
            "roles": role_counts,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "average_tier": avg_tier,
            "synergy_count": synergy_count + derived_combo_count
        }

    def evaluate_picked_hero(self, hero_id: int, team_picks: List[int], enemy_picks: List[int]) -> Dict | None:
        hero = self._get_heroes([hero_id])
        if not hero:
            return None

        picked_hero = hero[0]
        ally_ids = [item for item in team_picks if item != hero_id]
        lane_fit = self.get_lane_fit(picked_hero, ally_ids)
        tier_context = self.get_hero_tier_context(picked_hero, ally_ids)
        tier_reasons = self._dedupe_reasons(list(tier_context["reasons"]), 2) or [f"Tier {tier_context['tier']} hero"]

        counter_score, counter_reasons = self.get_counter_score(picked_hero, enemy_picks)
        synergy_score, synergy_reasons = self.get_synergy_score(picked_hero, ally_ids)
        role_score, role_reasons = self.get_role_balance_score(picked_hero, ally_ids)
        skill_counter_score, skill_counter_reasons = self.get_skill_counter_score(picked_hero, enemy_picks)
        skill_synergy_score, skill_synergy_reasons = self.get_skill_synergy_score(picked_hero, ally_ids)
        safety_score, safe_reasons, negative_reasons = self.get_safety_score(picked_hero, ally_ids, enemy_picks)

        score = (
            float(tier_context["score"]) * 1.0 +
            (counter_score * 1.5 + skill_counter_score * 1.1) +
            (synergy_score * 1.2 + skill_synergy_score * 1.0) +
            (role_score * 0.8) +
            safety_score
        )

        reasons = self._dedupe_reasons(
            tier_reasons + counter_reasons + skill_counter_reasons + synergy_reasons + skill_synergy_reasons + role_reasons + safe_reasons,
            4,
        )

        return {
            "hero": picked_hero,
            "lane_fit": lane_fit,
            "tier": str(tier_context["tier"]),
            "score": round(score, 2),
            "reasons": reasons,
            "risks": self._dedupe_reasons(negative_reasons, 3),
        }

    def get_team_standouts(self, team_picks: List[int], enemy_picks: List[int], top_n: int = 2) -> List[Dict]:
        standouts = []

        for hero_id in team_picks:
            hero_analysis = self.evaluate_picked_hero(hero_id, team_picks, enemy_picks)
            if hero_analysis:
                standouts.append(hero_analysis)

        standouts.sort(key=lambda item: item["score"], reverse=True)
        return standouts[:top_n]
