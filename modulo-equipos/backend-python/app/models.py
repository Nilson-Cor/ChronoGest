"""SQLAlchemy models — coinciden con el esquema creado por TypeORM."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, String, Text, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .database import Base


def new_uuid() -> str:
    return str(uuid.uuid4())


class Equipo(Base):
    __tablename__ = "equipos"

    id          = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    persona_id  = Column("persona_id",   String, nullable=True)
    visitante_id= Column("visitante_id", UUID(as_uuid=False), ForeignKey("visitantes_externos.id"), nullable=True)
    tipo        = Column(String(50),  nullable=False)
    marca       = Column(String(100), nullable=False)
    modelo      = Column(String(100), nullable=False)
    serial      = Column(String(200), unique=True, nullable=True)
    descripcion = Column(Text,        nullable=True)
    estado      = Column(String(20),  nullable=False, default="activo")
    foto_url    = Column("foto_url", String(500), nullable=True)
    created_at  = Column("created_at", DateTime, server_default=func.now())
    updated_at  = Column("updated_at", DateTime, server_default=func.now(), onupdate=func.now())

    visitante       = relationship("VisitanteExterno", back_populates="equipos")
    movimiento_equipos = relationship("MovimientoEquipo", back_populates="equipo")
    reportes        = relationship("Reporte", back_populates="equipo")


class VisitanteExterno(Base):
    __tablename__ = "visitantes_externos"

    id           = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    nombre       = Column(String(200), nullable=False)
    apellido     = Column(String(200), nullable=False)
    tipo_doc     = Column("tipo_doc", String(10), nullable=False, default="CC")
    documento    = Column(String(50),  nullable=False, unique=True)
    telefono     = Column(String(20),  nullable=True)
    empresa      = Column(String(200), nullable=True)
    motivo_visita= Column("motivo_visita", Text, nullable=True)
    created_at   = Column("created_at", DateTime, server_default=func.now())

    movimientos = relationship("Movimiento", back_populates="visitante")
    equipos     = relationship("Equipo",     back_populates="visitante")


class Movimiento(Base):
    __tablename__ = "movimientos"

    id                   = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    tipo                 = Column(String(10),  nullable=False)   # ENTRADA | SALIDA
    tipo_persona         = Column("tipo_persona", String(10), nullable=False)  # SISTEMA | EXTERNO
    persona_id           = Column("persona_id",   String,    nullable=True)
    visitante_id         = Column("visitante_id", UUID(as_uuid=False), ForeignKey("visitantes_externos.id"), nullable=True)
    qr_code              = Column("qr_code",      String,    nullable=True)
    observaciones        = Column(Text,            nullable=True)
    registrado_por       = Column("registrado_por",       String, nullable=True)
    registrado_por_nombre= Column("registrado_por_nombre", String, nullable=True)
    fecha_hora           = Column("fecha_hora", DateTime, server_default=func.now())
    created_at           = Column("created_at", DateTime, server_default=func.now())

    visitante        = relationship("VisitanteExterno", back_populates="movimientos")
    movimiento_equipos = relationship("MovimientoEquipo", back_populates="movimiento", cascade="all, delete-orphan")


class MovimientoEquipo(Base):
    __tablename__ = "movimiento_equipos"

    id           = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    movimiento_id= Column("movimiento_id", UUID(as_uuid=False), ForeignKey("movimientos.id", ondelete="CASCADE"), nullable=False)
    equipo_id    = Column("equipo_id",    UUID(as_uuid=False), ForeignKey("equipos.id"), nullable=False)
    observacion  = Column(Text, nullable=True)

    movimiento = relationship("Movimiento",      back_populates="movimiento_equipos")
    equipo     = relationship("Equipo",          back_populates="movimiento_equipos")


class Reporte(Base):
    __tablename__ = "reportes"

    id                  = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    equipo_id           = Column("equipo_id", UUID(as_uuid=False), ForeignKey("equipos.id"), nullable=False)
    tipo                = Column(String(20), nullable=False)   # DANO | PERDIDA | ROBO | OTRO
    descripcion         = Column(Text, nullable=False)
    estado              = Column(String(20), nullable=False, default="ACTIVO")
    reportado_por       = Column("reportado_por",        String, nullable=True)
    reportado_por_nombre= Column("reportado_por_nombre", String, nullable=True)
    resolucion          = Column(Text, nullable=True)
    fecha_reporte       = Column("fecha_reporte",    DateTime, server_default=func.now())
    fecha_resolucion    = Column("fecha_resolucion", DateTime, nullable=True)

    equipo = relationship("Equipo", back_populates="reportes")
