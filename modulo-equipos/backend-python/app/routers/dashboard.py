"""Router de dashboard."""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=None)
def get_dashboard(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    sql = text("""
        SELECT
          (SELECT COUNT(*) FROM equipos) AS total_equipos,

          (SELECT COUNT(*) FROM movimientos m
           WHERE m.tipo = 'ENTRADA'
             AND (m.fecha_hora AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date
                 = (NOW() AT TIME ZONE 'America/Bogota')::date
          ) AS entradas_hoy,

          (SELECT COUNT(*) FROM movimientos m
           WHERE m.tipo = 'SALIDA'
             AND (m.fecha_hora AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date
                 = (NOW() AT TIME ZONE 'America/Bogota')::date
          ) AS salidas_hoy,

          (
            SELECT COUNT(DISTINCT ultimo.owner_id)
            FROM (
              SELECT DISTINCT ON (
                COALESCE(m.persona_id::text, m.visitante_id::text)
              )
                COALESCE(m.persona_id::text, m.visitante_id::text) AS owner_id,
                m.tipo,
                m.tipo_persona
              FROM movimientos m
              WHERE m.tipo_persona = 'SISTEMA'
              ORDER BY COALESCE(m.persona_id::text, m.visitante_id::text), m.fecha_hora DESC
            ) ultimo
            WHERE ultimo.tipo = 'ENTRADA'
          ) AS personas_sistema_dentro,

          (
            SELECT COUNT(DISTINCT ultimo.visitante_id)
            FROM (
              SELECT DISTINCT ON (m.visitante_id)
                m.visitante_id,
                m.tipo
              FROM movimientos m
              WHERE m.tipo_persona = 'EXTERNO'
                AND m.visitante_id IS NOT NULL
              ORDER BY m.visitante_id, m.fecha_hora DESC
            ) ultimo
            WHERE ultimo.tipo = 'ENTRADA'
          ) AS visitantes_dentro,

          (SELECT COUNT(*) FROM reportes WHERE estado = 'ACTIVO') AS reportes_activos
    """)

    row = db.execute(sql).fetchone()
    return {
        "totalEquipos":          int(row[0] or 0),
        "entradasHoy":           int(row[1] or 0),
        "salidasHoy":            int(row[2] or 0),
        "personasSistemaDentro": int(row[3] or 0),
        "visitantesDentro":      int(row[4] or 0),
        "reportesActivos":       int(row[5] or 0),
    }
