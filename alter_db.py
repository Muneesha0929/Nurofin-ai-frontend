from sqlalchemy import create_engine, text

url = "postgresql://postgres:Asdfnurofin1234@3.108.153.169/nurofin_db_v2"

engine = create_engine(url)
with engine.connect() as conn:
    conn.execute(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS can_view_finance BOOLEAN DEFAULT FALSE;'))
    conn.commit()

print("Added column to database")
