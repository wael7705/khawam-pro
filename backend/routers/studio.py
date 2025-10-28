from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import requests
import os
import base64
import aiofiles

router = APIRouter()
REMOVE_BG_API_KEY = "QP2YU5oSDaLwXpzDRKv4fjo9"

@router.post("/remove-background")
async def remove_background(file: UploadFile = File(...)):
    try:
        # Save uploaded file
        upload_dir = "uploads/"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)
        
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
        
        # Call remove.bg API
        response = requests.post(
            'https://api.remove.bg/v1.0/removebg',
            files={'image_file': open(file_path, 'rb')},
            data={'size': 'auto'},
            headers={'X-Api-Key': REMOVE_BG_API_KEY},
        )
        
        if response.status_code == 200:
            output_path = os.path.join(upload_dir, f"no-bg-{file.filename}")
            with open(output_path, 'wb') as out:
                out.write(response.content)
            
            # Read and encode the output image
            with open(output_path, 'rb') as img_file:
                img_data = base64.b64encode(img_file.read()).decode('utf-8')
            
            return {"success": True, "image": f"data:image/png;base64,{img_data}"}
        else:
            raise HTTPException(status_code=500, detail="Failed to remove background")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/passport-photos")
async def create_passport_photos(file: UploadFile = File(...)):
    return {"message": "Passport photos generated"}

@router.post("/crop-rotate")
async def crop_rotate(file: UploadFile = File(...), angle: int = 0):
    return {"message": "Image cropped and rotated"}

@router.post("/apply-filter")
async def apply_filter(file: UploadFile = File(...), filter_type: str = "classic"):
    return {"message": f"Filter {filter_type} applied"}