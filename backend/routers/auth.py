from fastapi import APIRouter, Depends
router = APIRouter()

@router.post("/login")
async def login():
    return {"access_token": "dummy_token", "token_type": "bearer"}

@router.get("/me")
async def get_current_user():
    return {"message": "Current user"}

@router.get("/logout")
async def logout():
    return {"message": "Logged out"}