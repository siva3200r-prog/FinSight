import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Dependency to provide the Supabase client
def get_db() -> Client:
    # If keys are missing, we could return a mock or throw an error.
    # We create the client defensively.
    try:
        if SUPABASE_URL and SUPABASE_KEY:
            return create_client(SUPABASE_URL, SUPABASE_KEY)
        else:
            raise ValueError("Supabase keys are missing.")
    except Exception as e:
        # Returning None or a dummy object for local testing if needed
        # In actual production, it's better to fail fast.
        print(f"Failed to initialize Supabase client: {e}")
        return None
