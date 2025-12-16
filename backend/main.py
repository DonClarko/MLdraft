from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
