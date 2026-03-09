from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import pydantic.v1.fields
import pydantic.v1.schema
import typing

# --- MONKEY PATCH FOR SPACY WITH PYDANTIC >=2.10 ---
original_set_type = pydantic.v1.fields.ModelField._set_default_and_type
def _patched_set_default_and_type(self):
    try:
        original_set_type(self)
    except Exception:
        self.type_ = typing.Any
        self.outer_type_ = typing.Any

pydantic.v1.fields.ModelField._set_default_and_type = _patched_set_default_and_type

original_get_annotation = pydantic.v1.schema.get_annotation_from_field_info
def _patched_get_annotation(*args, **kwargs):
    try:
        return original_get_annotation(*args, **kwargs)
    except ValueError as e:
        if "not enforced" in str(e):
            return args[0]
        raise e

pydantic.v1.schema.get_annotation_from_field_info = _patched_get_annotation
# ----------------------------------------------------

from app.routers import expenses, subscriptions, budget, insights, ocr, dashboard

app = FastAPI(title="FinSight API", version="1.0.0")

# Allow React frontend to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3005", "http://127.0.0.1:3000", "http://127.0.0.1:3005"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to FinSight AI Backend"}

# Routers will be registered here
app.include_router(expenses.router, prefix="/api/expenses", tags=["Expenses"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["Subscriptions"])
app.include_router(ocr.router, prefix="/api/ocr", tags=["OCR"])
app.include_router(budget.router, prefix="/api/budget", tags=["Budget"])
app.include_router(insights.router, prefix="/api/insights", tags=["Insights"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
