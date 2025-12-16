"""
Seed script to populate the database with Mobile Legends heroes
Run this after setting up the database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models import Hero, TierList, TierListEntry, Counter, Synergy

# Create tables
Base.metadata.create_all(bind=engine)

# Mobile Legends Heroes Data (2024 roster)
HEROES_DATA = [
    # Tanks
    {"name": "Tigreal", "role": "tank", "specialty": "Crowd Control/Initiator"},
    {"name": "Akai", "role": "tank", "specialty": "Crowd Control/Regen"},
    {"name": "Franco", "role": "tank", "specialty": "Crowd Control"},
    {"name": "Minotaur", "role": "tank", "secondary_role": "support", "specialty": "Crowd Control/Regen"},
    {"name": "Lolita", "role": "tank", "specialty": "Guard/Crowd Control"},
    {"name": "Grock", "role": "tank", "specialty": "Damage/Crowd Control"},
    {"name": "Hylos", "role": "tank", "specialty": "Damage/Crowd Control"},
    {"name": "Uranus", "role": "tank", "specialty": "Regen/Poke"},
    {"name": "Belerick", "role": "tank", "specialty": "Regen/Crowd Control"},
    {"name": "Khufra", "role": "tank", "specialty": "Crowd Control/Initiator"},
    {"name": "Esmeralda", "role": "tank", "secondary_role": "mage", "specialty": "Regen/Poke"},
    {"name": "Baxia", "role": "tank", "specialty": "Damage/Crowd Control"},
    {"name": "Atlas", "role": "tank", "specialty": "Crowd Control/Initiator"},
    {"name": "Barats", "role": "tank", "specialty": "Damage/Crowd Control"},
    {"name": "Gloo", "role": "tank", "specialty": "Regen/Crowd Control"},
    {"name": "Edith", "role": "tank", "secondary_role": "marksman", "specialty": "Damage/Initiator"},
    {"name": "Fredrinn", "role": "tank", "secondary_role": "fighter", "specialty": "Damage/Regen"},
    {"name": "Johnson", "role": "tank", "specialty": "Initiator/Crowd Control"},
    {"name": "Gatotkaca", "role": "tank", "specialty": "Crowd Control/Damage"},
    {"name": "Hilda", "role": "tank", "secondary_role": "fighter", "specialty": "Damage/Regen"},
    {"name": "Carmilla", "role": "tank", "secondary_role": "support", "specialty": "Crowd Control/Guard"},
    {"name": "Chip", "role": "tank", "specialty": "Mobility/Support"},
    
    # Fighters
    {"name": "Balmond", "role": "fighter", "specialty": "Damage/Regen"},
    {"name": "Alucard", "role": "fighter", "specialty": "Chase/Damage"},
    {"name": "Bane", "role": "fighter", "specialty": "Push/Damage"},
    {"name": "Zilong", "role": "fighter", "specialty": "Chase/Damage"},
    {"name": "Freya", "role": "fighter", "specialty": "Damage/Crowd Control"},
    {"name": "Alpha", "role": "fighter", "specialty": "Chase/Damage"},
    {"name": "Ruby", "role": "fighter", "specialty": "Crowd Control/Regen"},
    {"name": "Roger", "role": "fighter", "specialty": "Chase/Damage"},
    {"name": "Lapu-Lapu", "role": "fighter", "specialty": "Burst/Crowd Control"},
    {"name": "Argus", "role": "fighter", "specialty": "Damage/Chase"},
    {"name": "Martis", "role": "fighter", "specialty": "Damage/Crowd Control"},
    {"name": "Jawhead", "role": "fighter", "specialty": "Crowd Control/Damage"},
    {"name": "Aldous", "role": "fighter", "specialty": "Chase/Damage"},
    {"name": "Leomord", "role": "fighter", "specialty": "Damage/Chase"},
    {"name": "Thamuz", "role": "fighter", "specialty": "Damage/Regen"},
    {"name": "Minsitthar", "role": "fighter", "specialty": "Crowd Control/Initiator"},
    {"name": "Terizla", "role": "fighter", "specialty": "Damage/Crowd Control"},
    {"name": "X.Borg", "role": "fighter", "specialty": "Damage/Regen"},
    {"name": "Dyrroth", "role": "fighter", "specialty": "Burst/Chase"},
    {"name": "Masha", "role": "fighter", "specialty": "Push/Damage"},
    {"name": "Silvanna", "role": "fighter", "secondary_role": "mage", "specialty": "Burst/Crowd Control"},
    {"name": "Yu Zhong", "role": "fighter", "specialty": "Damage/Regen"},
    {"name": "Khaleed", "role": "fighter", "specialty": "Damage/Regen"},
    {"name": "Paquito", "role": "fighter", "specialty": "Burst/Damage"},
    {"name": "Phoveus", "role": "fighter", "specialty": "Damage/Counter-mobility"},
    {"name": "Aulus", "role": "fighter", "specialty": "Damage/Push"},
    {"name": "Yin", "role": "fighter", "specialty": "Burst/Chase"},
    {"name": "Julian", "role": "fighter", "specialty": "Burst/Damage"},
    {"name": "Arlott", "role": "fighter", "specialty": "Damage/Crowd Control"},
    {"name": "Cici", "role": "fighter", "specialty": "Mobility/Damage"},
    {"name": "Sun", "role": "fighter", "specialty": "Push/Damage"},
    {"name": "Kaja", "role": "fighter", "secondary_role": "support", "specialty": "Crowd Control/Support"},
    {"name": "Guinevere", "role": "fighter", "secondary_role": "mage", "specialty": "Burst/Crowd Control"},
    {"name": "Badang", "role": "fighter", "specialty": "Damage/Crowd Control"},
    
    # Assassins
    {"name": "Saber", "role": "assassin", "specialty": "Burst/Chase"},
    {"name": "Karina", "role": "assassin", "specialty": "Burst/Reap"},
    {"name": "Fanny", "role": "assassin", "specialty": "Mobility/Damage"},
    {"name": "Hayabusa", "role": "assassin", "specialty": "Burst/Push"},
    {"name": "Natalia", "role": "assassin", "specialty": "Burst/Assassinate"},
    {"name": "Lancelot", "role": "assassin", "specialty": "Burst/Chase"},
    {"name": "Helcurt", "role": "assassin", "specialty": "Burst/Silence"},
    {"name": "Gusion", "role": "assassin", "specialty": "Burst/Damage"},
    {"name": "Selena", "role": "assassin", "secondary_role": "mage", "specialty": "Burst/Poke"},
    {"name": "Hanzo", "role": "assassin", "specialty": "Burst/Push"},
    {"name": "Ling", "role": "assassin", "specialty": "Mobility/Burst"},
    {"name": "Benedetta", "role": "assassin", "specialty": "Burst/Chase"},
    {"name": "Aamon", "role": "assassin", "specialty": "Burst/Assassinate"},
    {"name": "Joy", "role": "assassin", "specialty": "Burst/Mobility"},
    {"name": "Nolan", "role": "assassin", "specialty": "Burst/Crowd Control"},
    {"name": "Harley", "role": "assassin", "secondary_role": "mage", "specialty": "Burst/Poke"},
    {"name": "Suyou", "role": "assassin", "specialty": "Mobility/Burst"},
    
    # Mages
    {"name": "Eudora", "role": "mage", "specialty": "Burst/Poke"},
    {"name": "Alice", "role": "mage", "secondary_role": "tank", "specialty": "Regen/Damage"},
    {"name": "Nana", "role": "mage", "specialty": "Crowd Control/Poke"},
    {"name": "Kagura", "role": "mage", "specialty": "Burst/Poke"},
    {"name": "Cyclops", "role": "mage", "specialty": "Poke/Burst"},
    {"name": "Aurora", "role": "mage", "specialty": "Burst/Crowd Control"},
    {"name": "Vexana", "role": "mage", "specialty": "Burst/Crowd Control"},
    {"name": "Odette", "role": "mage", "specialty": "Burst/Crowd Control"},
    {"name": "Gord", "role": "mage", "specialty": "Poke/Damage"},
    {"name": "Pharsa", "role": "mage", "specialty": "Poke/Burst"},
    {"name": "Zhask", "role": "mage", "specialty": "Push/Damage"},
    {"name": "Valir", "role": "mage", "specialty": "Poke/Crowd Control"},
    {"name": "Chang'e", "role": "mage", "specialty": "Poke/Burst"},
    {"name": "Kadita", "role": "mage", "specialty": "Burst/Crowd Control"},
    {"name": "Cecilion", "role": "mage", "specialty": "Poke/Burst"},
    {"name": "Luo Yi", "role": "mage", "specialty": "Crowd Control/Support"},
    {"name": "Xavier", "role": "mage", "specialty": "Burst/Poke"},
    {"name": "Valentina", "role": "mage", "secondary_role": "assassin", "specialty": "Burst/Mobility"},
    {"name": "Novaria", "role": "mage", "specialty": "Poke/Burst"},
    {"name": "Zhuxin", "role": "mage", "specialty": "Burst/Crowd Control"},
    {"name": "Lunox", "role": "mage", "secondary_role": "support", "specialty": "Burst/Damage"},
    {"name": "Harith", "role": "mage", "secondary_role": "assassin", "specialty": "Burst/Mobility"},
    {"name": "Yve", "role": "mage", "specialty": "Poke/Crowd Control"},
    {"name": "Lylia", "role": "mage", "specialty": "Poke/Burst"},
    {"name": "Vale", "role": "mage", "specialty": "Burst/Crowd Control"},
    
    # Marksmen
    {"name": "Layla", "role": "marksman", "specialty": "Damage/Poke"},
    {"name": "Miya", "role": "marksman", "specialty": "Damage/Chase"},
    {"name": "Bruno", "role": "marksman", "specialty": "Damage/Burst"},
    {"name": "Clint", "role": "marksman", "specialty": "Damage/Burst"},
    {"name": "Moskov", "role": "marksman", "specialty": "Damage/Crowd Control"},
    {"name": "Karrie", "role": "marksman", "specialty": "Damage/Burst"},
    {"name": "Irithel", "role": "marksman", "specialty": "Damage/Burst"},
    {"name": "Lesley", "role": "marksman", "specialty": "Burst/Poke"},
    {"name": "Hanabi", "role": "marksman", "specialty": "Damage/Crowd Control"},
    {"name": "Claude", "role": "marksman", "specialty": "Burst/Mobility"},
    {"name": "Kimmy", "role": "marksman", "secondary_role": "mage", "specialty": "Poke/Damage"},
    {"name": "Granger", "role": "marksman", "specialty": "Burst/Poke"},
    {"name": "Wanwan", "role": "marksman", "specialty": "Burst/Mobility"},
    {"name": "Popol and Kupa", "role": "marksman", "specialty": "Damage/Crowd Control"},
    {"name": "Brody", "role": "marksman", "specialty": "Burst/Poke"},
    {"name": "Beatrix", "role": "marksman", "specialty": "Burst/Damage"},
    {"name": "Natan", "role": "marksman", "specialty": "Burst/Damage"},
    {"name": "Melissa", "role": "marksman", "specialty": "Damage/Guard"},
    {"name": "Ixia", "role": "marksman", "specialty": "Damage/Poke"},
    {"name": "Yi Sun-shin", "role": "marksman", "secondary_role": "assassin", "specialty": "Burst/Push"},
    
    # Supports
    {"name": "Rafaela", "role": "support", "specialty": "Heal/Poke"},
    {"name": "Estes", "role": "support", "specialty": "Heal/Guard"},
    {"name": "Angela", "role": "support", "specialty": "Guard/Support"},
    {"name": "Faramis", "role": "support", "specialty": "Support/Regen"},
    {"name": "Mathilda", "role": "support", "secondary_role": "assassin", "specialty": "Guard/Mobility"},
    {"name": "Floryn", "role": "support", "specialty": "Heal/Support"},
    {"name": "Diggie", "role": "support", "specialty": "Crowd Control/Guard"},
]

# Lane-based Tier List Data
# Tier lists are organized by LANE/POSITION, not by role
# Any hero can be ranked in any lane they can play
TIER_DATA = {
    "gold_lane": {
        # Gold lane: Marksmen, some mages, late-game carries
        "S": ["Beatrix", "Brody", "Wanwan", "Melissa", "Claude"],
        "A": ["Granger", "Natan", "Bruno", "Karrie", "Clint", "Moskov"],
        "B": ["Lesley", "Irithel", "Kimmy", "Miya", "Layla", "Hanabi"],
        "C": ["Popol and Kupa", "Yi Sun-shin"],
        "D": []
    },
    "exp_lane": {
        # Exp lane: Fighters, some tanks, offlane heroes
        "S": ["Paquito", "Yu Zhong", "Julian", "Arlott", "Fredrinn", "Esmeralda"],
        "A": ["X.Borg", "Thamuz", "Dyrroth", "Phoveus", "Khaleed", "Yin"],
        "B": ["Ruby", "Silvanna", "Lapu-Lapu", "Guinevere", "Terizla", "Badang"],
        "C": ["Alpha", "Martis", "Leomord", "Masha", "Aldous", "Hilda"],
        "D": ["Balmond", "Freya", "Argus", "Zilong", "Sun"]
    },
    "mid_lane": {
        # Mid lane: Mages, some assassins
        "S": ["Valentina", "Yve", "Xavier", "Lunox", "Zhuxin", "Kagura"],
        "A": ["Pharsa", "Cecilion", "Vale", "Harith", "Lylia", "Kadita"],
        "B": ["Valir", "Chang'e", "Aurora", "Luo Yi", "Novaria"],
        "C": ["Eudora", "Nana", "Gord", "Cyclops", "Odette"],
        "D": ["Vexana", "Alice"]
    },
    "jungle": {
        # Jungle: Assassins, some fighters and mages
        "S": ["Ling", "Lancelot", "Fanny", "Joy", "Nolan", "Hayabusa"],
        "A": ["Gusion", "Benedetta", "Aamon", "Karina", "Harley", "Selena"],
        "B": ["Natalia", "Hanzo", "Saber", "Roger", "Yi Sun-shin", "Harith"],
        "C": ["Helcurt", "Barats", "Baxia", "Aulus"],
        "D": []
    },
    "roamer": {
        # Roamer: Tanks, supports, some fighters
        "S": ["Khufra", "Atlas", "Mathilda", "Franco", "Tigreal", "Chou"],
        "A": ["Johnson", "Grock", "Hylos", "Angela", "Diggie", "Rafaela"],
        "B": ["Akai", "Belerick", "Estes", "Floryn", "Carmilla", "Kaja"],
        "C": ["Lolita", "Gloo", "Faramis", "Minotaur", "Gatotkaca"],
        "D": ["Uranus", "Chip"]
    }
}

# Sample Counter Data
COUNTERS_DATA = [
    # Phoveus counters mobility heroes
    {"hero": "Fanny", "countered_by": "Phoveus", "strength": "hard", "explanation": "Phoveus ult triggers on every Fanny cable"},
    {"hero": "Lancelot", "countered_by": "Phoveus", "strength": "hard", "explanation": "Phoveus punishes Lancelot's dashes"},
    {"hero": "Ling", "countered_by": "Phoveus", "strength": "hard", "explanation": "Phoveus can follow Ling anywhere"},
    {"hero": "Wanwan", "countered_by": "Phoveus", "strength": "medium", "explanation": "Phoveus can chase Wanwan's mobility"},
    
    # Khufra counters dash heroes
    {"hero": "Fanny", "countered_by": "Khufra", "strength": "hard", "explanation": "Khufra's ball stops Fanny's cables"},
    {"hero": "Lancelot", "countered_by": "Khufra", "strength": "medium", "explanation": "Khufra ball interrupts Lancelot dashes"},
    {"hero": "Gusion", "countered_by": "Khufra", "strength": "medium", "explanation": "Khufra ball blocks Gusion combo"},
    
    # Diggie counters CC heavy teams
    {"hero": "Atlas", "countered_by": "Diggie", "strength": "hard", "explanation": "Diggie ult removes Atlas CC"},
    {"hero": "Tigreal", "countered_by": "Diggie", "strength": "hard", "explanation": "Diggie purifies Tigreal combos"},
    {"hero": "Khufra", "countered_by": "Diggie", "strength": "medium", "explanation": "Diggie can cleanse Khufra CC"},
    
    # Minsitthar counters blink heroes
    {"hero": "Lancelot", "countered_by": "Minsitthar", "strength": "hard", "explanation": "Minsitthar ult prevents all dashes"},
    {"hero": "Benedetta", "countered_by": "Minsitthar", "strength": "hard", "explanation": "Benedetta can't dash in Minsitthar ult"},
    {"hero": "Fanny", "countered_by": "Minsitthar", "strength": "hard", "explanation": "Fanny cables don't work in his ult"},
    
    # Burst counters squishy mages
    {"hero": "Pharsa", "countered_by": "Lancelot", "strength": "hard", "explanation": "Lancelot can burst Pharsa easily"},
    {"hero": "Cecilion", "countered_by": "Gusion", "strength": "medium", "explanation": "Gusion can dive and burst Cecilion"},
    {"hero": "Chang'e", "countered_by": "Hayabusa", "strength": "hard", "explanation": "Hayabusa's ult makes him untargetable during Chang'e laser"},
]

# Sample Synergy Data
SYNERGIES_DATA = [
    # Johnson combos
    {"hero_1": "Johnson", "hero_2": "Odette", "strength": "strong", "explanation": "Classic JohnsonOdette car crash combo"},
    {"hero_1": "Johnson", "hero_2": "Angela", "strength": "strong", "explanation": "Angela attaches during Johnson car for burst"},
    {"hero_1": "Johnson", "hero_2": "Kadita", "strength": "medium", "explanation": "Kadita can combo after Johnson crash"},
    
    # Angela combos
    {"hero_1": "Angela", "hero_2": "Aldous", "strength": "strong", "explanation": "Angela attaches to diving Aldous"},
    {"hero_1": "Angela", "hero_2": "Yu Zhong", "strength": "medium", "explanation": "Angela buffs sustaining Yu Zhong"},
    
    # Atlas combos
    {"hero_1": "Atlas", "hero_2": "Gord", "strength": "strong", "explanation": "Gord ult during Atlas set"},
    {"hero_1": "Atlas", "hero_2": "Pharsa", "strength": "strong", "explanation": "Pharsa ults enemies in Atlas set"},
    {"hero_1": "Atlas", "hero_2": "Beatrix", "strength": "medium", "explanation": "Beatrix can burst Atlas set"},
    
    # Tigreal combos
    {"hero_1": "Tigreal", "hero_2": "Odette", "strength": "strong", "explanation": "Tigreal set + Odette ult combo"},
    {"hero_1": "Tigreal", "hero_2": "Aurora", "strength": "strong", "explanation": "Aurora freeze on Tigreal set"},
    
    # Mathilda enables assassins
    {"hero_1": "Mathilda", "hero_2": "Lancelot", "strength": "medium", "explanation": "Mathilda ult helps Lancelot engage"},
    {"hero_1": "Mathilda", "hero_2": "Gusion", "strength": "medium", "explanation": "Mathilda dash enables Gusion combos"},
]


def seed_database():
    """Seed the database with initial data"""
    db = SessionLocal()
    
    try:
        # Check if heroes already exist
        existing_heroes = db.query(Hero).count()
        if existing_heroes > 0:
            print(f"Database already has {existing_heroes} heroes. Skipping hero seed.")
        else:
            # Add heroes
            print("Seeding heroes...")
            for hero_data in HEROES_DATA:
                hero = Hero(**hero_data)
                db.add(hero)
            db.commit()
            print(f"Added {len(HEROES_DATA)} heroes")
        
        # Create tier lists
        existing_tier_lists = db.query(TierList).count()
        if existing_tier_lists > 0:
            print(f"Database already has {existing_tier_lists} tier lists. Skipping tier list seed.")
        else:
            print("Seeding tier lists...")
            for lane, tiers in TIER_DATA.items():
                tier_list = TierList(
                    lane=lane,
                    version="Patch 1.8.44",
                    is_active=True
                )
                db.add(tier_list)
                db.flush()  # Get ID
                
                for tier, hero_names in tiers.items():
                    for hero_name in hero_names:
                        hero = db.query(Hero).filter(Hero.name == hero_name).first()
                        if hero:
                            entry = TierListEntry(
                                tier_list_id=tier_list.id,
                                hero_id=hero.id,
                                tier=tier
                            )
                            db.add(entry)
            db.commit()
            print(f"Added tier lists for {len(TIER_DATA)} lanes")
        
        # Add counters
        existing_counters = db.query(Counter).count()
        if existing_counters > 0:
            print(f"Database already has {existing_counters} counters. Skipping counter seed.")
        else:
            print("Seeding counters...")
            counter_count = 0
            for counter_data in COUNTERS_DATA:
                hero = db.query(Hero).filter(Hero.name == counter_data["hero"]).first()
                counter_hero = db.query(Hero).filter(Hero.name == counter_data["countered_by"]).first()
                if hero and counter_hero:
                    counter = Counter(
                        hero_id=hero.id,
                        countered_by_id=counter_hero.id,
                        strength=counter_data["strength"],
                        explanation=counter_data["explanation"]
                    )
                    db.add(counter)
                    counter_count += 1
            db.commit()
            print(f"Added {counter_count} counter relationships")
        
        # Add synergies
        existing_synergies = db.query(Synergy).count()
        if existing_synergies > 0:
            print(f"Database already has {existing_synergies} synergies. Skipping synergy seed.")
        else:
            print("Seeding synergies...")
            synergy_count = 0
            for synergy_data in SYNERGIES_DATA:
                hero1 = db.query(Hero).filter(Hero.name == synergy_data["hero_1"]).first()
                hero2 = db.query(Hero).filter(Hero.name == synergy_data["hero_2"]).first()
                if hero1 and hero2:
                    synergy = Synergy(
                        hero_1_id=hero1.id,
                        hero_2_id=hero2.id,
                        strength=synergy_data["strength"],
                        explanation=synergy_data["explanation"]
                    )
                    db.add(synergy)
                    synergy_count += 1
            db.commit()
            print(f"Added {synergy_count} synergy relationships")
        
        print("\n✅ Database seeding complete!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
