# Routes package
from app.routes.heroes import router as heroes_router
from app.routes.tier_lists import router as tier_lists_router
from app.routes.counters import router as counters_router
from app.routes.synergies import router as synergies_router
from app.routes.draft import router as draft_router
from app.routes.auth import router as auth_router

__all__ = [
    "heroes_router",
    "tier_lists_router",
    "counters_router",
    "synergies_router",
    "draft_router",
    "auth_router"
]
