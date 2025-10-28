from fastapi import APIRouter
router = APIRouter()

@router.get("/")
async def get_orders():
    return {"orders": []}

@router.post("/")
async def create_order():
    return {"message": "Order created"}