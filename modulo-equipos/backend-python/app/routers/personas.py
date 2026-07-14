"""Router proxy hacia el sistema principal para personas."""
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx

from ..auth import get_current_user
from ..config import settings

router = APIRouter(prefix="/personas", tags=["personas"])
_security = HTTPBearer(auto_error=False)


def _extract_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> str:
    if credentials:
        return credentials.credentials
    cookie = request.cookies.get("token")
    if cookie:
        return cookie
    return ""


async def _get(path: str, token: str, params: dict = {}, extra_headers: dict = {}) -> list | dict:
    url = f"{settings.MAIN_API_URL}{path}"
    # extra_headers ya contiene Authorization y x-centro-tenant desde _tenant_headers
    headers = extra_headers if extra_headers else ({"Authorization": f"Bearer {token}"} if token else {})
    print(f"[PERSONAS PROXY] GET {url} headers={list(headers.keys())} params={params}")
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url, headers=headers, params=params)
            print(f"[PERSONAS PROXY] -> {r.status_code}")
            if r.status_code >= 400:
                raise HTTPException(
                    status_code=r.status_code,
                    detail=f"Sistema principal: {r.status_code} en {path}: {r.text[:300]}"
                )
            return r.json()
    except HTTPException as e:
        print(f"[PERSONAS PROXY] HTTPException {e.status_code}: {e.detail}")
        raise
    except httpx.RequestError as exc:
        print(f"[PERSONAS PROXY] RequestError: {exc}")
        raise HTTPException(status_code=502, detail=f"No se pudo conectar a {url}: {exc}")
    except Exception as exc:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error proxy {url}: {exc}")


def _normalize(p: dict) -> dict:
    return {
        "id":        p.get("idPersona") or p.get("id", ""),
        "idPersona": p.get("idPersona") or p.get("id", ""),
        "nombre":    p.get("nombre", ""),
        "apellido":  p.get("apellido", "") or p.get("primerApellido", ""),
        "cedula":    p.get("cedula"),
        "documento": str(p.get("cedula") or p.get("documento") or ""),
        "tipoDoc":   p.get("tipoDoc"),
        "cargo":     p.get("cargo"),
        "correo":    p.get("correo"),
        "fotoPerfil":p.get("fotoPerfil"),
        "estado":    p.get("estado"),
    }


def _tenant_headers(user: dict, token: str) -> dict:
    centro_slug = user.get("centroSlug") or user.get("centro_slug") or user.get("slug") or ""
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    if centro_slug:
        h["x-centro-tenant"] = centro_slug
    return h


@router.get("/todas")
async def get_todas(
    request: Request,
    user: dict = Depends(get_current_user),
    token: str = Depends(_extract_token),
):
    data = await _get("/personas/activos", token, extra_headers=_tenant_headers(user, token))
    if isinstance(data, list):
        return [_normalize(p) for p in data]
    return data


@router.get("/activos")
async def get_activos(
    request: Request,
    user: dict = Depends(get_current_user),
    token: str = Depends(_extract_token),
):
    data = await _get("/personas/activos", token, extra_headers=_tenant_headers(user, token))
    if isinstance(data, list):
        return [_normalize(p) for p in data]
    return data


@router.get("/buscar")
async def buscar_personas(
    request: Request,
    q: str = Query(...),
    user: dict = Depends(get_current_user),
    token: str = Depends(_extract_token),
):
    q = q.strip()
    headers = _tenant_headers(user, token)

    if q.isdigit():
        try:
            data = await _get(f"/personas/cedula/{q}", token, extra_headers=headers)
            if isinstance(data, list):
                return [_normalize(p) for p in data]
            if isinstance(data, dict) and (data.get("idPersona") or data.get("id")):
                return [_normalize(data)]
        except HTTPException:
            pass

    data = await _get("/personas/activos", token, extra_headers=headers)
    if not isinstance(data, list):
        return []

    q_lower = q.lower()
    results = []
    for p in data:
        nombre_completo = f"{p.get('nombre','')} {p.get('apellido','')} {p.get('primerApellido','')}".lower()
        cedula = str(p.get("cedula") or "")
        if q_lower in nombre_completo or q_lower in cedula:
            results.append(_normalize(p))
    return results


@router.get("/{id}")
async def get_persona(
    id: str,
    request: Request,
    user: dict = Depends(get_current_user),
    token: str = Depends(_extract_token),
):
    headers = _tenant_headers(user, token)
    data = await _get(f"/personas/{id}", token, extra_headers=headers)
    if isinstance(data, dict):
        return _normalize(data)
    return data
