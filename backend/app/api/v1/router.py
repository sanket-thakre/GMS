from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    admin_test,
    assignment_rules,
    categories,
    hierarchies,
    tickets,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["tickets"])
api_router.include_router(admin_test.router, prefix="/admin-test", tags=["admin-test"])
api_router.include_router(hierarchies.router, prefix="/hierarchies", tags=["hierarchies"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(
    assignment_rules.router, prefix="/assignment-rules", tags=["assignment-rules"]
)
