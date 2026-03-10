import openai
import os
import re
import json
import base64
from PIL import Image
import io


class OCRService:
    def __init__(self):
        from dotenv import load_dotenv
        # Explicitly load .env from the backend directory
        load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

        openai_api_key = os.getenv("OPENAI_API_KEY", "")

        if openai_api_key:
            print(f"INFO: OPENAI_API_KEY found (length: {len(openai_api_key)})")
            try:
                self.client = openai.OpenAI(api_key=openai_api_key)
                print("INFO: OpenAI client initialized successfully (model=gpt-4o-mini).")
            except Exception as e:
                print(f"ERROR: Failed to initialize OpenAI client: {str(e)}")
                self.client = None
        else:
            print("WARNING: OPENAI_API_KEY NOT FOUND in environment variables.")
            self.client = None

    def test_connection(self) -> tuple:
        """Minimal check for API key validity."""
        if not self.client:
            return False, "OpenAI client not initialized. Check OPENAI_API_KEY in backend/.env"
        return True, "Client initialized"

    def _encode_image(self, image_bytes: bytes) -> str:
        """Convert image bytes to base64 string for OpenAI API."""
        return base64.b64encode(image_bytes).decode("utf-8")

    def _extract_text_from_image(self, image_bytes: bytes) -> str:
        if not self.client:
            return json.dumps({"error": "OpenAI API key is missing or client not initialized."})

        try:
            base64_image = self._encode_image(image_bytes)

            prompt = """Analyze this receipt image and extract all readable information.

Return ONLY a valid JSON object with these exact fields:
{
  "merchant": "store name or null",
  "date": "YYYY-MM-DD or null",
  "items": [
    {"name": "item name", "price": 0.00}
  ],
  "total_amount": 0.00,
  "payment_method": "cash/card/null",
  "raw_text": "all visible text from the receipt"
}

Rules:
- total_amount must be the final total shown on the receipt.
- If an item price is unclear, set it to 0.
- raw_text should contain all readable text from the image.
- Return ONLY the JSON object, no extra text, no markdown code blocks."""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1024,
                temperature=0.2
            )

            result = response.choices[0].message.content.strip()
            print(f"DEBUG: OpenAI raw response: {result[:300]}")
            return result

        except openai.AuthenticationError:
            print("ERROR: OpenAI API key is invalid or expired.")
            return json.dumps({"error": "Invalid OpenAI API key. Please check your OPENAI_API_KEY."})
        except openai.RateLimitError:
            print("ERROR: OpenAI rate limit exceeded.")
            return json.dumps({"error": "OpenAI rate limit exceeded. Please try again later."})
        except Exception as e:
            print(f"ERROR: OpenAI OCR Failed: {str(e)}")
            return json.dumps({"error": f"OCR analysis failed: {str(e)}"})

    def _parse_json_response(self, raw_text: str) -> dict:
        """Extract JSON from model response, handling markdown code blocks."""
        # Strip markdown code blocks if present
        cleaned = re.sub(r"```(?:json)?", "", raw_text).strip().rstrip("`").strip()
        # Extract JSON object
        match = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if match:
            cleaned = match.group(0)
        return json.loads(cleaned)

    def process_receipt(self, image_bytes: bytes) -> dict:
        # File size validation (10MB limit)
        if len(image_bytes) > 10 * 1024 * 1024:
            return {"success": False, "error": "File size exceeds 10MB limit."}

        # Validate image
        try:
            img = Image.open(io.BytesIO(image_bytes))
            img.verify()
            img = Image.open(io.BytesIO(image_bytes))  # Re-open after verify
        except Exception:
            return {"success": False, "error": "Invalid image file. Upload a JPG, PNG, or WebP image."}

        try:
            raw_response = self._extract_text_from_image(image_bytes)
            data = self._parse_json_response(raw_response)

            if "error" in data:
                return {"success": False, "error": data["error"]}

            return {
                "success": True,
                "merchant": data.get("merchant"),
                "date": data.get("date"),
                "items": data.get("items", []),
                "total_amount": data.get("total_amount", 0.0),
                "payment_method": data.get("payment_method"),
                "raw_text": data.get("raw_text", "")
            }
        except Exception as e:
            print(f"ERROR: Failed to process receipt: {e}")
            return {"success": False, "error": "OCR analysis failed"}
