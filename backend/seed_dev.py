"""
Dev seed script — populates roles and a default admin user so the app is usable
locally. Idempotent: safe to re-run. NOT for production.

Run from the backend/ directory:  python seed_dev.py
"""
from app.db.session import SessionLocal
from app.models.roles import Role
from app.models.users import User
from app.models.hierarchies import Hierarchy, HierarchyLevel
from app.models.assignment_rules import AssignmentRule
from app.core.security import get_password_hash
from app.services.escalation_engine import get_or_create_system_user

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

# A default intake office + catch-all assignment rule so tickets can be filed
# out of the box (Phase 14 makes ticket creation rule-gated).
DEFAULT_OFFICE_NAME = "Default Intake Office"

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

        # Seed the non-login `system` user used to attribute automated
        # (Phase 17) SLA escalations — audit_logs.action_by_user_id is NOT null.
        get_or_create_system_user(db)

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

        # Seed a default intake office (APMC) for the catch-all rule to target.
        office = (
            db.query(Hierarchy)
            .filter(Hierarchy.name == DEFAULT_OFFICE_NAME)
            .first()
        )
        if not office:
            office = Hierarchy(
                name=DEFAULT_OFFICE_NAME,
                level=HierarchyLevel.APMC,
                parent_id=None,
            )
            db.add(office)
            db.commit()
            db.refresh(office)
            print(f"Created default office: {office.name} (id={office.id})")
        else:
            print(f"Default office already exists: {office.name} (id={office.id})")

        # Seed a catch-all (wildcard) default assignment rule so ticket creation
        # resolves an office even before any category-specific rules are added.
        default_rule = (
            db.query(AssignmentRule)
            .filter(AssignmentRule.is_default.is_(True))
            .first()
        )
        if not default_rule:
            db.add(AssignmentRule(
                category_id=None,
                hierarchy_id=office.id,
                is_default=True,
                priority_order=100,
            ))
            db.commit()
            print(f"Created default assignment rule -> {office.name}")
        else:
            print(f"Default assignment rule already exists (-> hierarchy_id={default_rule.hierarchy_id})")

        print("Roles in DB:", sorted(r.name for r in db.query(Role).all()))
    finally:
        db.close()

if __name__ == "__main__":
    main()
