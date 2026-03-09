from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.ocr_service import OCRService

router = APIRouter()
ocr_service = OCRService()

@router.post("/upload")
async def upload_receipt(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        extracted_data = ocr_service.process_receipt(contents)
        return extracted_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")
