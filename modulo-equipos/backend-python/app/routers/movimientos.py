"""Router de movimientos."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload
import httpx

from ..database import get_db
from ..models import Movimiento, MovimientoEquipo, VisitanteExterno
from ..schemas import CreateMovimientoDto
from ..auth import get_current_user, get_raw_token
from ..config import settings

router = APIRouter(prefix="/movimientos", tags=["movimientos"])


def _main_headers(token: Optional[str], user: dict) -> dict:
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    slug = user.get("centroSlug") or user.get("centro_slug") or user.get("slug") or ""
    if slug:
        h["x-centro-tenant"] = slug
    return h


async def _enrich_movimientos(movs: list, token: Optional[str], user: dict = {}) -> dict:
    """Obtiene datos de persona del sistema principal para cada movimiento."""
    persona_ids = list({m.persona_id for m in movs if m.persona_id})
    personas_map: dict[str, dict] = {}
    if not persona_ids or not token:
        return personas_map
    headers = _main_headers(token, user)
    async with httpx.AsyncClient(timeout=5.0) as client:
        for pid in persona_ids:
            try:
                r = await client.get(
                    f"{settings.MAIN_API_URL}/personas/{pid}",
                    headers=headers,
                )
                if r.status_code == 200:
                    p = r.json()
                    personas_map[pid] = {
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
    return personas_map


def _ser_movimiento(m: Movimiento, personas_map: dict) -> dict:
    equipos = []
    for me in (m.movimiento_equipos or []):
        eq = me.equipo
        item = {
            "id":          str(me.id),
            "equipoId":    str(me.equipo_id),
            "observacion": me.observacion,
            "equipo": {
                "id":     str(eq.id),
                "tipo":   eq.tipo,
                "marca":  eq.marca,
                "modelo": eq.modelo,
                "serial": eq.serial,
            } if eq else None,
        }
        equipos.append(item)

    visitante = None
    if m.visitante:
        v = m.visitante
        visitante = {
            "id":            str(v.id),
            "nombre":        v.nombre,
            "apellido":      v.apellido,
            "tipoDocumento": v.tipo_doc,
            "documento":     v.documento,
        }

    return {
        "id":                  str(m.id),
        "tipo":                m.tipo,
        "tipoPersona":         m.tipo_persona,
        "personaId":           m.persona_id,
        "visitanteId":         str(m.visitante_id) if m.visitante_id else None,
        "observaciones":       m.observaciones,
        "registradoPorNombre": m.registrado_por_nombre,
        "fechaHora":           m.fecha_hora.isoformat() if m.fecha_hora else None,
        "movimientoEquipos":   equipos,
        "equipos":             equipos,
        "visitante":           visitante,
        "persona":             personas_map.get(m.persona_id) if m.persona_id else None,
    }


@router.get("", response_model=None)
async def get_movimientos(
    tipo:         Optional[str]  = Query(None),
    tipo_persona: Optional[str]  = Query(None, alias="tipoPersona"),
    persona_id:   Optional[str]  = Query(None, alias="personaId"),
    visitante_id: Optional[str]  = Query(None, alias="visitanteId"),
    desde:        Optional[str]  = Query(None),
    hasta:        Optional[str]  = Query(None),
    limit:        int            = Query(100),
    db:           Session = Depends(get_db),
    user:         dict    = Depends(get_current_user),
    token:        Optional[str]  = Depends(get_raw_token),
):
    q = (
        db.query(Movimiento)
        .options(
            joinedload(Movimiento.movimiento_equipos).joinedload(MovimientoEquipo.equipo),
            joinedload(Movimiento.visitante),
        )
    )
    if tipo:
        q = q.filter(Movimiento.tipo == tipo)
    if tipo_persona:
        q = q.filter(Movimiento.tipo_persona == tipo_persona)
    if persona_id:
        q = q.filter(Movimiento.persona_id == persona_id)
    if visitante_id:
        q = q.filter(Movimiento.visitante_id == visitante_id)
    if desde:
        q = q.filter(Movimiento.fecha_hora >= desde)
    if hasta:
        q = q.filter(Movimiento.fecha_hora <= hasta)

    movs = q.order_by(Movimiento.fecha_hora.desc()).limit(limit).all()
    personas_map = await _enrich_movimientos(movs, token, user)
    return [_ser_movimiento(m, personas_map) for m in movs]


@router.get("/recientes", response_model=None)
async def get_recientes(
    limit: int = Query(10),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
    token: Optional[str] = Depends(get_raw_token),
):
    movs = (
        db.query(Movimiento)
        .options(
            joinedload(Movimiento.movimiento_equipos).joinedload(MovimientoEquipo.equipo),
            joinedload(Movimiento.visitante),
        )
        .order_by(Movimiento.fecha_hora.desc())
        .limit(limit)
        .all()
    )
    personas_map = await _enrich_movimientos(movs, token, user)
    return [_ser_movimiento(m, personas_map) for m in movs]


@router.post("", response_model=None, status_code=201)
async def create_movimiento(
    body: CreateMovimientoDto,
    db:   Session = Depends(get_db),
    user: dict    = Depends(get_current_user),
    token: Optional[str] = Depends(get_raw_token),
):
    nombre_usuario = (
        user.get("nome") or user.get("nombre") or user.get("name")
        or user.get("sub") or user.get("idPersona") or "Sistema"
    )
    registrado_por = (
        user.get("sub") or user.get("idPersona") or user.get("id")
        or nombre_usuario
    )

    mov = Movimiento(
        id                   = str(uuid.uuid4()),
        tipo                 = body.tipo,
        tipo_persona         = body.tipoPersona,
        persona_id           = body.personaId,
        visitante_id         = body.visitanteId,
        qr_code              = body.qrCode,
        observaciones        = body.observaciones,
        registrado_por       = registrado_por,
        registrado_por_nombre= nombre_usuario,
        fecha_hora           = datetime.now(timezone.utc),
    )
    db.add(mov)
    db.flush()

    for eq_item in body.equipos:
        me = MovimientoEquipo(
            id           = str(uuid.uuid4()),
            movimiento_id= mov.id,
            equipo_id    = eq_item.equipoId,
            observacion  = eq_item.observacion,
        )
        db.add(me)

    db.commit()

    # Recargar con relaciones
    saved = (
        db.query(Movimiento)
        .options(
            joinedload(Movimiento.movimiento_equipos).joinedload(MovimientoEquipo.equipo),
            joinedload(Movimiento.visitante),
        )
        .filter(Movimiento.id == mov.id)
        .first()
    )
    personas_map = await _enrich_movimientos([saved], token, user)
    return _ser_movimiento(saved, personas_map)


@router.delete("/{id}")
def delete_movimiento(id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    mov = db.query(Movimiento).filter(Movimiento.id == id).first()
    if not mov:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    db.delete(mov)
    db.commit()
    return {"message": f"Movimiento {id} eliminado"}
