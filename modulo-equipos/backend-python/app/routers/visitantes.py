"""Router de visitantes externos."""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import VisitanteExterno, Equipo
from ..schemas import CreateVisitanteDto, UpdateVisitanteDto
from ..auth import get_current_user

router = APIRouter(prefix="/visitantes", tags=["visitantes"])


def _ser(v: VisitanteExterno) -> dict:
    return {
        "id":             str(v.id),
        "nombre":         v.nombre,
        "apellido":       v.apellido,
        "tipoDocumento":  v.tipo_doc,
        "documento":      v.documento,
        "telefono":       v.telefono,
        "empresa":        v.empresa,
        "motivoVisita":   v.motivo_visita,
        "createdAt":      v.created_at.isoformat() if v.created_at else None,
    }


@router.get("", response_model=None)
def get_visitantes(
    q:   Optional[str] = Query(None),
    db:  Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    query = db.query(VisitanteExterno)
    if q:
        like = f"%{q}%"
        query = query.filter(
            VisitanteExterno.nombre.ilike(like)
            | VisitanteExterno.apellido.ilike(like)
            | VisitanteExterno.documento.ilike(like)
        )
    return [_ser(v) for v in query.order_by(VisitanteExterno.created_at.desc()).all()]


@router.get("/{id}", response_model=None)
def get_visitante(id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    v = db.query(VisitanteExterno).filter(VisitanteExterno.id == id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Visitante no encontrado")
    return _ser(v)


@router.post("", response_model=None, status_code=201)
def create_visitante(body: CreateVisitanteDto, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    tipo = body.tipoDocumento or body.tipoDoc or body.tipo_documento or "CC"
    motivo = body.motivoVisita or body.motivo_visita

    v = VisitanteExterno(
        id          = str(uuid.uuid4()),
        nombre      = body.nombre,
        apellido    = body.apellido,
        tipo_doc    = tipo,
        documento   = body.documento,
        telefono    = body.telefono,
        empresa     = body.empresa,
        motivo_visita = motivo,
    )
    db.add(v)
    db.flush()

    if body.equipos:
        for eq_dto in body.equipos:
            eq = Equipo(
                id           = str(uuid.uuid4()),
                tipo         = eq_dto.tipo,
                marca        = eq_dto.marca,
                modelo       = eq_dto.modelo,
                serial       = eq_dto.serial,
                descripcion  = eq_dto.descripcion,
                visitante_id = v.id,
            )
            db.add(eq)

    db.commit()
    db.refresh(v)
    return _ser(v)


@router.put("/{id}", response_model=None)
def update_visitante(id: str, body: UpdateVisitanteDto, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    v = db.query(VisitanteExterno).filter(VisitanteExterno.id == id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Visitante no encontrado")
    data = body.model_dump(exclude_none=True)
    if "tipoDocumento" in data or "tipoDoc" in data:
        v.tipo_doc = data.pop("tipoDocumento", None) or data.pop("tipoDoc", None) or v.tipo_doc
    if "motivoVisita" in data:
        v.motivo_visita = data.pop("motivoVisita")
    for field, val in data.items():
        if hasattr(v, field):
            setattr(v, field, val)
    db.commit()
    db.refresh(v)
    return _ser(v)


@router.delete("/{id}")
def delete_visitante(id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    v = db.query(VisitanteExterno).filter(VisitanteExterno.id == id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Visitante no encontrado")
    db.delete(v)
    db.commit()
    return {"message": f"Visitante {id} eliminado"}
