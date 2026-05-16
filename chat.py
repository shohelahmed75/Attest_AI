import os
from dotenv import load_dotenv

load_dotenv()

if os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"):
    from g_ai import g_ragnar
    g_ragnar()
elif os.getenv("OPENAI_API_KEY"):
    from o_ai import o_ragnar as ragnar_open
    ragnar_open()
else:
    print("Error: No API key found!")
    print("Set one of: GOOGLE_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY")