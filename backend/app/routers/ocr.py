from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.ocr_service import OCRService

router = APIRouter()
ocr_service = OCRService()

@router.post("/upload")
async def upload_receipt(file: UploadFile = File(...)):
    print(f"INFO: Received OCR upload request for file: {file.filename}")
    
    # Check file size (FastAPI side as well, even though we check in service)
    try:
        # We need to seek back if we read it here, or just let the service handle it.
        # But let's let the service handle it for simplicity.
        contents = await file.read()
        print(f"INFO: File size: {len(contents)} bytes")
        
        extracted_data = ocr_service.process_receipt(contents)
        
        if not extracted_data.get("success", False):
            print(f"WARNING: OCR processing failed: {extracted_data.get('error')}")
            raise HTTPException(status_code=500, detail=extracted_data.get("error", "OCR processing failed"))
            
        print(f"INFO: OCR processing successful for {file.filename}")
        return extracted_data
    except Exception as e:
        print(f"ERROR: OCR processing failed for {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")
