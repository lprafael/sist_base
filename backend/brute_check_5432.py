
from sqlalchemy import create_engine, text

for psw in ['admin', 'adminperalta', 'postgres']:
    url = f"postgresql://postgres:{psw}@localhost:5432/SIGEL"
    try:
        engine = create_engine(url, connect_args={'connect_timeout': 3})
        with engine.connect() as conn:
            print(f"SUCCESS with password '{psw}'")
            res = conn.execute(text("SELECT count(*) FROM electoral.ref_locales"))
            print(f"COUNT: {res.scalar()}")
            break
    except Exception as e:
        print(f"FAILED with password '{psw}': {str(e)[:100]}")
