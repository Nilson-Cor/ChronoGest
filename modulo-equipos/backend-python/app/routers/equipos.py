"""Router de equipos."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import text
from sqlalchemy.orm import Session
import httpx

from ..database import get_db
from ..models import Equipo, VisitanteExterno, MovimientoEquipo
from ..schemas import CreateEquipoDto, UpdateEquipoDto, EquipoOut
from ..auth import get_current_user, get_raw_token
from ..config import settings

router = APIRouter(prefix="/equipos", tags=["equipos"])


def _dentro_map(db: Session) -> dict[str, bool]:
    """Retorna {equipo_id: dentroDelCentro} calculado con DISTINCT ON."""
    sql = text("""
        SELECT DISTINCT ON (me.equipo_id)
            me.equipo_id,
            m.tipo
        FROM movimiento_equipos me
        JOIN movimientos m ON m.id = me.movimiento_id
        ORDER BY me.equipo_id, m.fecha_hora DESC
    """)
    rows = db.execute(sql).fetchall()
    return {str(r[0]): (r[1] == "ENTRADA") for r in rows}


def _main_headers(token: Optional[str], user: dict) -> dict:
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    slug = user.get("centroSlug") or user.get("centro_slug") or user.get("slug") or ""
    if slug:
        h["x-centro-tenant"] = slug
    return h


async def _enrich_personas(equipos: list, token: Optional[str], user: dict = {}) -> dict:
    """Llama al sistema principal para obtener datos de persona."""
    persona_ids = list({e.persona_id for e in equipos if e.persona_id})
    if not persona_ids or not token:
        return {}
    headers = _main_headers(token, user)
    async with httpx.AsyncClient(timeout=5.0) as client:
        results = {}
        for pid in persona_ids:
            try:
                r = await client.get(
                    f"{settings.MAIN_API_URL}/personas/{pid}",
                    headers=headers,
                )
                if r.status_code == 200:
                    p = r.json()
                    results[pid] = {
                        "id":        p.get("idPersona") or p.get("id"),
                        "idPersona": p.get("idPersona") or p.get("id"),
                        "nombre":    p.get("nombre", ""),
                        "apellido":  p.get("apellido", "") or p.get("primerApellido", ""),
                        "cedula":    p.get("cedula"),
                        "documento": str(p.get("cedula") or p.get("documento") or ""),
                        "fotoPerfil":p.get("fotoPerfil"),
                        "cargo":     p.get("cargo"),
                    }
            except Exception:
                pass
        return results


def _serialize_equipo(eq: Equipo, dentro_map: dict, personas_map: dict) -> dict:
    d = {
        "id":              str(eq.id),
        "tipo":            eq.tipo,
        "marca":           eq.marca,
        "modelo":          eq.modelo,
        "serial":          eq.serial,
        "descripcion":     eq.descripcion,
        "estado":          eq.estado,
        "fotoUrl":         eq.foto_url,
        "personaId":       eq.persona_id,
        "visitanteId":     str(eq.visitante_id) if eq.visitante_id else None,
        "createdAt":       eq.created_at.isoformat() if eq.created_at else None,
        "updatedAt":       eq.updated_at.isoformat() if eq.updated_at else None,
        "dentroDelCentro": dentro_map.get(str(eq.id)),
        "persona":         personas_map.get(eq.persona_id) if eq.persona_id else None,
        "visitante":       None,
    }
    if eq.visitante:
        v = eq.visitante
        d["visitante"] = {
            "id":             str(v.id),
            "nombre":         v.nombre,
            "apellido":       v.apellido,
            "tipoDocumento":  v.tipo_doc,
            "documento":      v.documento,
            "telefono":       v.telefono,
            "empresa":        v.empresa,
        }
    return d


@router.get("", response_model=None)
async def get_equipos(
    tipo:         Optional[str] = Query(None),
    estado:       Optional[str] = Query(None),
    q:            Optional[str] = Query(None),
    persona_id:   Optional[str] = Query(None, alias="personaId"),
    visitante_id: Optional[str] = Query(None, alias="visitanteId"),
    db:           Session = Depends(get_db),
    user:         dict = Depends(get_current_user),
    token:        Optional[str] = Depends(get_raw_token),
):
    query = db.query(Equipo)
    if tipo:
        query = query.filter(Equipo.tipo == tipo)
    if estado:
        query = query.filter(Equipo.estado == estado)
    if persona_id:
        query = query.filter(Equipo.persona_id == persona_id)
    if visitante_id:
        query = query.filter(Equipo.visitante_id == visitante_id)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Equipo.marca.ilike(like))
            | (Equipo.modelo.ilike(like))
            | (Equipo.serial.ilike(like))
            | (Equipo.tipo.ilike(like))
        )
    equipos = query.all()
    dentro_map = _dentro_map(db)
    personas_map = await _enrich_personas(equipos, token, user)
    return [_serialize_equipo(e, dentro_map, personas_map) for e in equipos]


@router.get("/:id", response_model=None)
def get_equipo(id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    eq = db.query(Equipo).filter(Equipo.id == id).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return _serialize_equipo(eq, {}, {})


@router.post("", response_model=None, status_code=201)
async def create_equipo(request: Request, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    raw = await request.json()
    body = CreateEquipoDto.model_validate(raw)
    eq = Equipo(
        tipo        = body.tipo,
        marca       = body.marca,
        modelo      = body.modelo,
        serial      = body.serial,
        descripcion = body.descripcion,
        estado      = body.estado,
        persona_id  = body.get_persona_id(),
        visitante_id= body.get_visitante_id(),
    )
    db.add(eq)
    db.commit()
    db.refresh(eq)
    return _serialize_equipo(eq, {}, {})


@router.put("/{id}", response_model=None)
async def update_equipo(id: str, request: Request, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    raw = await request.json()
    body = UpdateEquipoDto.model_validate(raw)
    eq = db.query(Equipo).filter(Equipo.id == id).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    pid = body.get_persona_id()
    vid = body.get_visitante_id()
    data = body.model_dump(exclude_none=True, exclude={"personaId","visitanteId","persona_id","visitante_id"})
    for field, val in data.items():
        if hasattr(eq, field):
            setattr(eq, field, val)
    if pid is not None: eq.persona_id   = pid
    if vid is not None: eq.visitante_id = vid
    db.commit()
    db.refresh(eq)
    return _serialize_equipo(eq, {}, {})


@router.delete("/{id}")
def delete_equipo(id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    eq = db.query(Equipo).filter(Equipo.id == id).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    db.query(MovimientoEquipo).filter(MovimientoEquipo.equipo_id == id).delete()
    db.delete(eq)
    db.commit()
    return {"message": f"Equipo {id} eliminado"}
