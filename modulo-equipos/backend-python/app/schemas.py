"""Pydantic schemas para request/response."""
from __future__ import annotations
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ── Equipo ────────────────────────────────────────────────────────────────────

class EquipoBase(BaseModel):
    tipo:        str
    marca:       str
    modelo:      str
    serial:      Optional[str]  = None
    descripcion: Optional[str]  = None
    estado:      str            = "activo"

class CreateEquipoDto(EquipoBase):
    # Acepta camelCase del frontend; persona_id se extrae en el router desde raw JSON
    personaId:   Optional[str] = None
    visitanteId: Optional[str] = None
    # snake_case por compatibilidad
    persona_id:   Optional[str] = None
    visitante_id: Optional[str] = None

    def get_persona_id(self) -> Optional[str]:
        return self.personaId or self.persona_id

    def get_visitante_id(self) -> Optional[str]:
        return self.visitanteId or self.visitante_id

class UpdateEquipoDto(BaseModel):
    tipo:         Optional[str] = None
    marca:        Optional[str] = None
    modelo:       Optional[str] = None
    serial:       Optional[str] = None
    descripcion:  Optional[str] = None
    estado:       Optional[str] = None
    personaId:    Optional[str] = None
    visitanteId:  Optional[str] = None
    persona_id:   Optional[str] = None
    visitante_id: Optional[str] = None

    def get_persona_id(self) -> Optional[str]:
        return self.personaId or self.persona_id

    def get_visitante_id(self) -> Optional[str]:
        return self.visitanteId or self.visitante_id

class EquipoOut(EquipoBase):
    model_config = ConfigDict(from_attributes=True)
    id:            str
    persona_id:    Optional[str] = None
    visitante_id:  Optional[str] = None
    created_at:    Optional[datetime] = None
    updated_at:    Optional[datetime] = None
    # Enriquecidos por el router
    persona:       Optional[Any]  = None
    visitante:     Optional[Any]  = None
    dentro_del_centro: Optional[bool] = None

    def model_post_init(self, __context: Any) -> None:
        # Alias camelCase para el frontend
        object.__setattr__(self, "dentroDelCentro", self.dentro_del_centro)
        object.__setattr__(self, "personaId",       self.persona_id)
        object.__setattr__(self, "visitanteId",     self.visitante_id)
        object.__setattr__(self, "createdAt",       self.created_at)

    def model_dump(self, **kw):  # type: ignore[override]
        d = super().model_dump(**kw)
        d["dentroDelCentro"] = d.pop("dentro_del_centro", None)
        d["personaId"]       = d.pop("persona_id", None)
        d["visitanteId"]     = d.pop("visitante_id", None)
        d["createdAt"]       = d.pop("created_at", None)
        d["updatedAt"]       = d.pop("updated_at", None)
        d["fotoUrl"]         = None
        return d


# ── Visitante ─────────────────────────────────────────────────────────────────

class EquipoVisitanteDto(BaseModel):
    tipo:        str
    marca:       str
    modelo:      str
    serial:      Optional[str] = None
    descripcion: Optional[str] = None

class CreateVisitanteDto(BaseModel):
    nombre:        str
    apellido:      str
    tipo_documento: Optional[str] = "CC"
    tipoDocumento:  Optional[str] = None
    tipoDoc:        Optional[str] = None
    documento:     str
    telefono:      Optional[str] = None
    empresa:       Optional[str] = None
    motivo_visita: Optional[str] = None
    motivoVisita:  Optional[str] = None
    equipos:       Optional[List[EquipoVisitanteDto]] = None

class UpdateVisitanteDto(BaseModel):
    nombre:        Optional[str] = None
    apellido:      Optional[str] = None
    tipoDocumento: Optional[str] = None
    tipoDoc:       Optional[str] = None
    documento:     Optional[str] = None
    telefono:      Optional[str] = None
    empresa:       Optional[str] = None
    motivo_visita: Optional[str] = None
    motivoVisita:  Optional[str] = None

class VisitanteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:            str
    nombre:        str
    apellido:      str
    tipo_doc:      str
    documento:     str
    telefono:      Optional[str] = None
    empresa:       Optional[str] = None
    motivo_visita: Optional[str] = None
    created_at:    Optional[datetime] = None

    def model_dump(self, **kw):  # type: ignore[override]
        d = super().model_dump(**kw)
        d["tipoDocumento"] = d.pop("tipo_doc", "CC")
        d["motivoVisita"]  = d.pop("motivo_visita", None)
        d["createdAt"]     = d.pop("created_at", None)
        return d


# ── Movimiento ────────────────────────────────────────────────────────────────

class EquipoEnMovimientoDto(BaseModel):
    equipoId:    str
    observacion: Optional[str] = None

class CreateMovimientoDto(BaseModel):
    tipo:        str   # ENTRADA | SALIDA
    tipoPersona: str   # SISTEMA | EXTERNO
    personaId:   Optional[str] = None
    visitanteId: Optional[str] = None
    qrCode:      Optional[str] = None
    observaciones: Optional[str] = None
    equipos:     List[EquipoEnMovimientoDto] = []

class MovimientoEquipoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:        str
    equipo_id: str
    observacion: Optional[str] = None
    equipo:    Optional[Any]   = None

    def model_dump(self, **kw):  # type: ignore[override]
        d = super().model_dump(**kw)
        d["equipoId"] = d.pop("equipo_id")
        if d.get("equipo"):
            eq = d["equipo"]
            d["equipo"] = {
                "id":     eq.get("id"),
                "tipo":   eq.get("tipo"),
                "marca":  eq.get("marca"),
                "modelo": eq.get("modelo"),
                "serial": eq.get("serial"),
            }
        return d

class MovimientoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:                    str
    tipo:                  str
    tipo_persona:          str
    persona_id:            Optional[str] = None
    visitante_id:          Optional[str] = None
    observaciones:         Optional[str] = None
    registrado_por_nombre: Optional[str] = None
    fecha_hora:            Optional[datetime] = None
    movimiento_equipos:    List[Any] = []
    visitante:             Optional[Any] = None
    # enriquecido
    persona:               Optional[Any] = None

    def model_dump(self, **kw):  # type: ignore[override]
        d = super().model_dump(**kw)
        d["tipoPersona"]        = d.pop("tipo_persona")
        d["personaId"]          = d.pop("persona_id", None)
        d["visitanteId"]        = d.pop("visitante_id", None)
        d["registradoPorNombre"]= d.pop("registrado_por_nombre", None)
        d["fechaHora"]          = d.pop("fecha_hora", None)
        # Normalizar movimientoEquipos
        mes = d.pop("movimiento_equipos", [])
        normalized = []
        for me in mes:
            if hasattr(me, "model_dump"):
                me = me.model_dump()
            item = {
                "equipoId":    me.get("equipo_id") or me.get("equipoId"),
                "id":          me.get("id"),
                "observacion": me.get("observacion"),
            }
            eq = me.get("equipo")
            if eq and hasattr(eq, "__dict__"):
                item["equipo"] = {
                    "id": eq.id, "tipo": eq.tipo, "marca": eq.marca,
                    "modelo": eq.modelo, "serial": eq.serial,
                }
            elif eq and isinstance(eq, dict):
                item["equipo"] = eq
            else:
                item["equipo"] = None
            normalized.append(item)
        d["movimientoEquipos"] = normalized
        d["equipos"]           = normalized  # alias para el frontend
        # visitante camelCase
        if d.get("visitante"):
            v = d["visitante"]
            if hasattr(v, "__dict__"):
                d["visitante"] = {
                    "id": v.id, "nombre": v.nombre, "apellido": v.apellido,
                    "documento": v.documento, "tipoDocumento": v.tipo_doc,
                }
            elif isinstance(v, dict):
                d["visitante"]["tipoDocumento"] = v.get("tipo_doc", v.get("tipoDocumento"))
        return d


# ── Reporte ───────────────────────────────────────────────────────────────────

class CreateReporteDto(BaseModel):
    equipoId:    str
    tipo:        str   # DANO | PERDIDA | ROBO | OTRO
    descripcion: str

class ResolverReporteDto(BaseModel):
    resolucion: str

class ReporteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:                   str
    equipo_id:            str
    tipo:                 str
    descripcion:          str
    estado:               str
    reportado_por_nombre: Optional[str] = None
    resolucion:           Optional[str] = None
    fecha_reporte:        Optional[datetime] = None
    fecha_resolucion:     Optional[datetime] = None
    equipo:               Optional[Any] = None

    def model_dump(self, **kw):  # type: ignore[override]
        d = super().model_dump(**kw)
        d["equipoId"]          = d.pop("equipo_id")
        d["reportadoPorNombre"]= d.pop("reportado_por_nombre", None)
        d["fechaReporte"]      = d.pop("fecha_reporte", None)
        d["fechaResolucion"]   = d.pop("fecha_resolucion", None)
        if d.get("equipo"):
            eq = d["equipo"]
            if hasattr(eq, "__dict__"):
                d["equipo"] = {
                    "id": eq.id, "tipo": eq.tipo, "marca": eq.marca,
                    "modelo": eq.modelo, "serial": eq.serial,
                }
        return d
