from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from .config import settings

security = HTTPBearer(auto_error=False)


def _decode(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])


def get_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    """Extrae el JWT del header Authorization o de la cookie 'token'."""
    if credentials:
        return credentials.credentials
    cookie = request.cookies.get("token")
    if cookie:
        return cookie
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado")


def get_current_user(token: str = Depends(get_token)) -> dict:
    try:
        payload = _decode(token)
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")


def get_raw_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[str]:
    """Token sin lanzar excepción — para llamadas opcionales al sistema principal."""
    if credentials:
        return credentials.credentials
    return request.cookies.get("token")
