import google.generativeai as genai
import spacy
import os
import re

# Load small spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    import spacy.cli
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

from PIL import Image
import io

class OCRService:
    def __init__(self):
        gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        if gemini_api_key:
            genai.configure(api_key=gemini_api_key)
            # Use gemini-1.5-flash as the lightweight multi-modal model
            self.model = genai.GenerativeModel("gemini-1.5-flash")
        else:
            self.model = None

    def _extract_text_from_image(self, image_bytes: bytes) -> str:
        if not self.model:
            return "MOCK OCR TEXT. Date: 2026-03-09. Amount: $42.00. Merchant: Mock Store. Category: Shopping."
            
        try:
            image = Image.open(io.BytesIO(image_bytes))
            response = self.model.generate_content([
                "Extract all text from this receipt, ensuring merchant name, date, and total amount are captured.",
                image
            ])
            return response.text
        except Exception as e:
            print(f"Gemini OCR Failed: {e}")
            return ""

    def process_receipt(self, image_bytes: bytes) -> dict:
        raw_text = self._extract_text_from_image(image_bytes)
        
        # Parse text using Spacy & rule-based extraction
        doc = nlp(raw_text)
        
        # Simple extraction heuristics based on the NLP tokens
        merchant = "Unknown Merchant"
        amount = 0.0
        date_str = "Unknown Date"
        
        # Amount extraction: look for $ or words like "Total"
        # Spacy entity extraction
        for ent in doc.ents:
            if ent.label_ == "ORG" and merchant == "Unknown Merchant":
                merchant = ent.text
            elif ent.label_ == "DATE" and date_str == "Unknown Date":
                date_str = ent.text
            elif ent.label_ == "MONEY":
                # Try to clean monetary value
                val = re.sub(r'[^\d.]', '', ent.text)
                try:
                    num = float(val)
                    if num > amount: # Often total is the largest standard money amount
                        amount = num
                except ValueError:
                    pass
        
        # Fallback regex for amounts if MONEY entity fails
        if amount == 0.0:
            amounts = re.findall(r'\$?\s?(\d+\.\d{2})', raw_text)
            if amounts:
                 amount = max([float(a) for a in amounts])

        # Very basic categorization heuristic
        lower_text = raw_text.lower()
        category = "Other"
        if "restaurant" in lower_text or "food" in lower_text or "cafe" in lower_text:
            category = "Food"
        elif "uber" in lower_text or "taxi" in lower_text or "transit" in lower_text:
            category = "Transport"
        elif "amazon" in lower_text or "walmart" in lower_text or "target" in lower_text:
            category = "Shopping"

        return {
            "merchant": merchant.strip(),
            "amount": amount,
            "date": date_str.strip(),
            "category": category,
            "raw_text_Preview": raw_text[:100] # just for debugging
        }
