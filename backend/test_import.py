import traceback
try:
    from app import main
except Exception as e:
    with open("full_trace.txt", "w") as f:
        f.write(traceback.format_exc())
