from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from app.config import settings
from app.database import engine, Base
from app.routes import (
    heroes_router,
    tier_lists_router,
    counters_router,
    synergies_router,
    draft_router,
    auth_router
)

# Create database tables
Base.metadata.create_all(bind=engine)


def ensure_draft_columns() -> None:
    inspector = inspect(engine)
    if "drafts" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("drafts")}
    required_columns = {
        "verdict": "TEXT",
        "analysis_summary": "TEXT",
        "blue_win_probability": "FLOAT",
        "red_win_probability": "FLOAT",
        "standout_picks": "TEXT",
    }

    with engine.begin() as connection:
        for column_name, column_type in required_columns.items():
            if column_name not in existing_columns:
                connection.execute(text(f"ALTER TABLE drafts ADD COLUMN {column_name} {column_type}"))


def ensure_hero_columns() -> None:
    inspector = inspect(engine)
    if "heroes" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("heroes")}
    required_columns = {
        "global_rg_win_rate": "FLOAT",
        "global_rg_source": "TEXT",
    }

    with engine.begin() as connection:
        for column_name, column_type in required_columns.items():
            if column_name not in existing_columns:
                connection.execute(text(f"ALTER TABLE heroes ADD COLUMN {column_name} {column_type}"))


ensure_hero_columns()
ensure_draft_columns()

# Create FastAPI app
app = FastAPI(
    title="ML Draft AI",
    description="Mobile Legends Draft Simulator with AI Recommendations",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(heroes_router)
app.include_router(tier_lists_router)
app.include_router(counters_router)
app.include_router(synergies_router)
app.include_router(draft_router)


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "ML Draft AI API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
