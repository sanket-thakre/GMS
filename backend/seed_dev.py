"""
Dev seed script — populates roles and a default admin user so the app is usable
locally. Idempotent: safe to re-run. NOT for production.

Run from the backend/ directory:  python seed_dev.py
"""
from app.db.session import SessionLocal
from app.models.roles import Role
from app.models.users import User
from app.core.security import get_password_hash

ROLES = [
    ("Admin", "Full system administrator"),
    ("DoM_Admin", "Directorate of Marketing administrator"),
    ("DDR_Officer", "Deputy Director (Region) officer"),
    ("APMC_Officer", "APMC market officer"),
    ("DML_Officer", "District Marketing officer"),
    ("PML_Officer", "Private Market officer"),
    ("Complainant", "Citizen / grievance complainant"),
]

ADMIN_EMAIL = "admin@gms.gov"
ADMIN_PASSWORD = "Admin@123"

def main():
    db = SessionLocal()
    try:
        # Seed roles
        existing = {r.name for r in db.query(Role).all()}
        for name, desc in ROLES:
            if name not in existing:
                db.add(Role(name=name, description=desc))
        db.commit()

        admin_role = db.query(Role).filter(Role.name == "Admin").first()

        # Seed default admin user
        admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if not admin:
            db.add(User(
                full_name="System Administrator",
                email=ADMIN_EMAIL,
                phone=None,
                hashed_password=get_password_hash(ADMIN_PASSWORD),
                role_id=admin_role.id,
            ))
            db.commit()
            print(f"Created admin user: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        else:
            print(f"Admin user already exists: {ADMIN_EMAIL}")

        print("Roles in DB:", sorted(r.name for r in db.query(Role).all()))
    finally:
        db.close()

if __name__ == "__main__":
    main()
