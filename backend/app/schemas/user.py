from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    phone: str | None = None
    password: str
    role: str = "Complainant"


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str | None
    role_id: int
    role_name: str
    hierarchy_id: int | None = None

    model_config = {"from_attributes": True}


class UserListItem(UserOut):
    hierarchy_id: int | None = None
    hierarchy_name: str | None = None


class UserAdminUpdate(BaseModel):
    hierarchy_id: int | None = None
    role_id: int | None = None
