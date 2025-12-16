from fastapi import APIRouter, Depends, HTTPException, status
from datetime import timedelta
from app.schemas import AdminLogin, Token
from app.auth import authenticate_admin, create_access_token, get_current_admin
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
def login(credentials: AdminLogin):
    """Admin login endpoint"""
    if not authenticate_admin(credentials.username, credentials.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": credentials.username},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/verify")
def verify_token(admin: str = Depends(get_current_admin)):
    """Verify if the current token is valid"""
    return {"valid": True, "username": admin}


@router.post("/logout")
def logout():
    """Logout endpoint (client-side token removal)"""
    return {"message": "Logged out successfully"}
