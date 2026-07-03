/**
 * seed-full.ts — Seed completo del estado actual del proyecto ChronoGest
 *
 * Datos reales extraídos del backup mysql_legacy_dump_20260624.sql
 * adaptados al esquema PostgreSQL / arquitectura hexagonal actual.
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-full.ts
 *
 * O con variables de entorno explícitas:
 *   MASTER_DB_PASSWORD=<pwd> npx ts-node -r tsconfig-paths/register scripts/seed-full.ts
 *
 * El script es IDEMPOTENTE: si ya existen datos, los omite (upsert por
 * campos únicos) para que pueda ejecutarse más de una vez sin duplicar.
 *
 * BASES DE DATOS que toca:
 *   1. chronogest_master_db  → root_users, centros_tenant
 *   2. epsas_db (tenant "default") → todo el proyecto formativo
 *   3. horarios_db (tenant "default") → horarios + asignaciones + competencias
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

// ─── Entities master ────────────────────────────────────────────────────────
import { CentroTenant } from '../src/centro-tenant-admin/infrastructure/entities/centro-tenant.entity';
import { RootUser }    from '../src/centro-tenant-admin/infrastructure/entities/root-user.entity';

// ─── Entities epsas_db ──────────────────────────────────────────────────────
import { Aplicativo }      from '../src/aplicativos/infrastructure/persistence/aplicativo.entity';
import { Rol }             from '../src/roles/infrastructure/persistence/rol.entity';
import { Modulo }          from '../src/modulos/infrastructure/persistence/modulo.entity';
import { Departamento }    from '../src/departamentos/infrastructure/persistence/departamento.entity';
import { Municipio }       from '../src/municipios/infrastructure/persistence/municipio.entity';
import { CentroFormacion } from '../src/centro_formacion/infrastructure/persistence/centro-formacion.entity';
import { Sede }            from '../src/sedes/infrastructure/persistence/sede.entity';
import { Area }            from '../src/areas/infrastructure/persistence/area.entity';
import { Programa }        from '../src/programas/infrastructure/persistence/programa.entity';
import { Ambiente }        from '../src/ambientes/infrastructure/persistence/ambiente.entity';
import { Persona }         from '../src/personas/infrastructure/persistence/persona.entity';
import { Usuario }         from '../src/usuarios/infrastructure/persistence/usuario.entity';
import { Credencial }      from '../src/credenciales/infrastructure/persistence/credencial.entity';
import { Curso }           from '../src/cursos/infrastructure/persistence/curso.entity';
import { Matricula }       from '../src/matriculas/infrastructure/persistence/matricula.entity';

// ─── Entities horarios_db ───────────────────────────────────────────────────
import { Horario }           from '../src/horarios-cg/infrastructure/persistence/horario.entity';
import { AsignacionHorario } from '../src/horarios-cg/infrastructure/persistence/asignacion-horario.entity';
import { Competencia }       from '../src/horarios-cg/infrastructure/persistence/competencia.entity';

// ────────────────────────────────────────────────────────────────────────────

const PG_HOST = process.env.DB_HOST ?? process.env.MASTER_DB_HOST ?? 'localhost';
const PG_PORT = Number(process.env.DB_PORT ?? process.env.MASTER_DB_PORT ?? 5435);
const PG_USER = process.env.DB_USER ?? process.env.MASTER_DB_USER ?? 'postgres';
const PG_PASS = process.env.DB_PASSWORD ?? process.env.MASTER_DB_PASSWORD ?? '';

function ds(database: string, entities: any[]): DataSource {
  return new DataSource({
    type: 'postgres', host: PG_HOST, port: PG_PORT,
    username: PG_USER, password: PG_PASS, database,
    synchronize: false, logging: false, entities,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function upsertOne<T extends object>(
  repo: import('typeorm').Repository<T>,
  where: Partial<T>,
  data: Partial<T>,
): Promise<T> {
  let entity = await repo.findOne({ where: where as any });
  if (!entity) {
    entity = repo.create({ ...where, ...data } as any);
    await repo.save(entity as any);
    return entity;
  }
  // Actualizar campos para que sea idempotente
  Object.assign(entity, data);
  await repo.save(entity as any);
  return entity;
}

async function hash(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

// ────────────────────────────────────────────────────────────────────────────

async function seedMaster(masterDs: DataSource) {
  console.log('\n[1/3] Seeding chronogest_master_db...');

  const rootRepo   = masterDs.getRepository(RootUser);
  const tenantRepo = masterDs.getRepository(CentroTenant);

  // Root user super-admin
  const rootPassword = await hash('Admin1234!');
  await upsertOne(rootRepo, { email: 'admin@chronogest.com' } as any, {
    password: rootPassword,
  } as any);
  console.log('  ✓ Root user: admin@chronogest.com / Admin1234!');

  // Tenant "default" — Centro de Gestión y Desarrollo Surcolombiano
  await upsertOne(tenantRepo, { slug: 'default' } as any, {
    nombre:        'Centro de Gestión y Desarrollo Surcolombiano',
    dominio:       'cgds.sena.edu.co',
    estado:        'activo',
    epsasDbName:   'epsas_db',
    epsasDbHost:   PG_HOST,
    epsasDbPort:   PG_PORT,
    horariosDbName: 'horarios_db',
    horariosDbHost: PG_HOST,
    horariosDbPort: PG_PORT,
  } as any);
  console.log('  ✓ Tenant: default → epsas_db / horarios_db');
}

// ────────────────────────────────────────────────────────────────────────────

async function seedEpsas(epsasDs: DataSource) {
  console.log('\n[2/3] Seeding epsas_db...');

  // ── Aplicativo ─────────────────────────────────────────────────────────
  const aplicativoRepo = epsasDs.getRepository(Aplicativo);
  let app = await aplicativoRepo.findOne({ where: { nombre: 'ChronoGest' } as any });
  if (!app) {
    app = aplicativoRepo.create({ nombre: 'ChronoGest' });
    await aplicativoRepo.save(app);
  }
  const appId = app.idAplicativo;
  console.log('  ✓ Aplicativo: ChronoGest');

  // ── Roles ───────────────────────────────────────────────────────────────
  const rolRepo = epsasDs.getRepository(Rol);
  const rolesData = ['administrador', 'instructor', 'aprendiz'];
  const roles: Record<string, Rol> = {};
  for (const nombre of rolesData) {
    let rol = await rolRepo.findOne({ where: { nombre, aplicativoId: appId } as any });
    if (!rol) {
      rol = rolRepo.create({ nombre, aplicativo: { idAplicativo: appId } as any } as any);
      await rolRepo.save(rol);
    }
    roles[nombre] = rol;
  }
  console.log('  ✓ Roles: administrador, instructor, aprendiz');

  // ── Módulos ─────────────────────────────────────────────────────────────
  const moduloRepo = epsasDs.getRepository(Modulo);
  const modulosData = [
    'Dashboard', 'Horarios', 'Fichas', 'Ambientes', 'Instructores',
    'Aprendices', 'Competencias', 'Solicitudes de Cambio', 'Eventos',
    'Notificaciones', 'Configuración', 'Proyecto Formativo', 'Reportes',
  ];
  for (const nombre of modulosData) {
    const exists = await moduloRepo.findOne({ where: { modulo: nombre, aplicativoId: appId } as any });
    if (!exists) {
      const m = moduloRepo.create({ modulo: nombre, aplicativo: { idAplicativo: appId } as any } as any);
      await moduloRepo.save(m);
    }
  }
  console.log('  ✓ Módulos (13)');

  // ── Departamento ────────────────────────────────────────────────────────
  const deptRepo = epsasDs.getRepository(Departamento);
  let huila = await deptRepo.findOne({ where: { nombre: 'Huila' } as any });
  if (!huila) {
    huila = deptRepo.create({ nombre: 'Huila' });
    await deptRepo.save(huila);
  }
  const huilaId = (huila as any).idDepartamento as string;
  console.log('  ✓ Departamento: Huila');

  // ── Municipio ───────────────────────────────────────────────────────────
  const munRepo = epsasDs.getRepository(Municipio);
  let pitalito = await munRepo.findOne({ where: { nombre: 'Pitalito' } as any });
  if (!pitalito) {
    pitalito = munRepo.create({ nombre: 'Pitalito', departamento: { idDepartamento: huilaId } as any } as any);
    await munRepo.save(pitalito);
  }
  const pitalId = (pitalito as any).idMunicipio as string;
  console.log('  ✓ Municipio: Pitalito (Huila)');

  // ── Centro de formación ─────────────────────────────────────────────────
  const centroRepo = epsasDs.getRepository(CentroFormacion);
  let centro = await centroRepo.findOne({ where: { nombre: 'Centro de gestion y desarrollo Surcolombiano' } as any });
  if (!centro) {
    centro = centroRepo.create({
      nombre:    'Centro de gestion y desarrollo Surcolombiano',
      direccion: 'Cra. 8 #7-53',
      municipio: { idMunicipio: pitalId } as any,
    } as any);
    await centroRepo.save(centro);
  }
  const centroId = (centro as any).idCentro as string;
  console.log('  ✓ Centro de Formación: CGDS');

  // ── Sede ────────────────────────────────────────────────────────────────
  const sedeRepo = epsasDs.getRepository(Sede);
  let yamboro = await sedeRepo.findOne({ where: { nombre: 'Yamboro' } as any });
  if (!yamboro) {
    yamboro = sedeRepo.create({ nombre: 'Yamboro', centroFormacion: { idCentro: centroId } as any } as any);
    await sedeRepo.save(yamboro);
  }
  const sedeId = (yamboro as any).idSede as string;
  console.log('  ✓ Sede: Yamboro');

  // ── Áreas ───────────────────────────────────────────────────────────────
  const areaRepo = epsasDs.getRepository(Area);
  const areasData = [
    'TIC', 'Agropecuario', 'Ambiental', 'Turismo', 'Bioconstrucción',
  ];
  const areas: Record<string, Area> = {};
  for (const nombre of areasData) {
    let area = await areaRepo.findOne({ where: { nombre } as any });
    if (!area) {
      area = areaRepo.create({ nombre, sede: { idSede: sedeId } as any } as any);
      await areaRepo.save(area);
    }
    areas[nombre] = area;
  }
  console.log('  ✓ Áreas: TIC, Agropecuario, Ambiental, Turismo, Bioconstrucción');

  // ── Programas ───────────────────────────────────────────────────────────
  const progRepo = epsasDs.getRepository(Programa);
  const programasData: Array<{ nombre: string; tipo: string }> = [
    { nombre: 'Analisis y desarrollo de software',        tipo: 'tecnologo' },
    { nombre: 'Producción Agropecuaria Ecológica',        tipo: 'tecnologo' },
    { nombre: 'Gestión de Empresas Agropecuarias',        tipo: 'tecnologo' },
    { nombre: 'Gestión Agroempresarial',                  tipo: 'tecnologo' },
    { nombre: 'Promotoria Campesina en Agroecologia',     tipo: 'tecnico' },
    { nombre: 'Labores de Campo en Cultivos',             tipo: 'curso_corto' },
    { nombre: 'Produccion de Cafes Especiales',           tipo: 'tecnico' },
    { nombre: 'Tecnico en Operaciones Forestales',        tipo: 'tecnico' },
    { nombre: 'Producción Pecuaria',                      tipo: 'tecnico' },
    { nombre: 'Manejo de la Produccion Pecuaria',         tipo: 'curso_corto' },
    { nombre: 'Gestion de Recursos Naturales',            tipo: 'tecnologo' },
    { nombre: 'Prevencion y Control Ambiental',           tipo: 'tecnologo' },
    { nombre: 'Construcción de Infraestructura Vial',     tipo: 'tecnologo' },
    { nombre: 'Construccion, Mantenimiento y Reparacion de EST', tipo: 'tecnico' },
    { nombre: 'Construccion de Edificaciones',            tipo: 'tecnico' },
    { nombre: 'Catastro',                                 tipo: 'tecnico' },
    { nombre: 'Dibujo Arquitectónico',                    tipo: 'tecnico' },
    { nombre: 'Instalacion de Sistemas Electricos Residenciales', tipo: 'tecnico' },
    { nombre: 'Produccion Multimedia',                    tipo: 'tecnologo' },
    { nombre: 'Gestión de Redes de Datos',                tipo: 'tecnologo' },
    { nombre: 'Cocina',                                   tipo: 'tecnico' },
    { nombre: 'Servicios de Barismo',                     tipo: 'tecnico' },
    { nombre: 'Ejecucion de Clases Grupales Orientadas al Fitness', tipo: 'tecnico' },
  ];
  const programas: Record<string, Programa> = {};
  for (const { nombre, tipo } of programasData) {
    let prog = await progRepo.findOne({ where: { nombre } as any });
    if (!prog) {
      prog = progRepo.create({ nombre, tipo: tipo as any } as any);
      await progRepo.save(prog);
    }
    programas[nombre] = prog;
  }
  console.log(`  ✓ Programas (${programasData.length})`);

  // ── Ambientes ───────────────────────────────────────────────────────────
  const ambRepo = epsasDs.getRepository(Ambiente);
  const ambientesData: Array<{ nombre: string; capacidad: number; area: string; tipo: string }> = [
    { nombre: 'Ambiente Y12',  capacidad: 35, area: 'TIC',         tipo: 'Ambiente' },
    { nombre: 'Ambiente Y1',   capacidad: 30, area: 'Agropecuario', tipo: 'Ambiente' },
    { nombre: 'Ambiente Y2',   capacidad: 30, area: 'Agropecuario', tipo: 'Ambiente' },
    { nombre: 'Ambiente Y3',   capacidad: 35, area: 'Agropecuario', tipo: 'Ambiente' },
    { nombre: 'Ambiente Y4',   capacidad: 35, area: 'Agropecuario', tipo: 'Ambiente' },
    { nombre: 'Ambiente Y5',   capacidad: 30, area: 'Agropecuario', tipo: 'Ambiente' },
    { nombre: 'Ambiente Y7',   capacidad: 35, area: 'Agropecuario', tipo: 'Ambiente' },
    { nombre: 'Ambiente Y8',   capacidad: 30, area: 'Agropecuario', tipo: 'Ambiente' },
    { nombre: 'Ambiente Y13',  capacidad: 35, area: 'TIC',          tipo: 'Ambiente' },
    { nombre: 'Ambiente Y14',  capacidad: 35, area: 'TIC',          tipo: 'Ambiente' },
    { nombre: 'Ambiente Y15',  capacidad: 35, area: 'TIC',          tipo: 'Ambiente' },
    { nombre: 'Ambiente Y18',  capacidad: 35, area: 'Turismo',       tipo: 'Ambiente' },
    { nombre: 'Ambiente Y19',  capacidad: 30, area: 'Turismo',       tipo: 'Ambiente' },
    { nombre: 'Ambiente Y25',  capacidad: 35, area: 'Bioconstrucción', tipo: 'Ambiente' },
    { nombre: 'Ambiente Y26',  capacidad: 35, area: 'Ambiental',    tipo: 'Ambiente' },
    { nombre: 'Ambiente Y27',  capacidad: 35, area: 'Ambiental',    tipo: 'Ambiente' },
  ];
  const ambientes: Record<string, Ambiente> = {};
  for (const { nombre, capacidad, area, tipo } of ambientesData) {
    let amb = await ambRepo.findOne({ where: { nombre } as any });
    if (!amb) {
      amb = ambRepo.create({
        nombre, capacidad, tipo, estado: 'activo',
        sede: { idSede: sedeId } as any,
        municipio: { idMunicipio: pitalId } as any,
        area: areas[area] ? { idArea: (areas[area] as any).idArea } as any : undefined,
      } as any);
      await ambRepo.save(amb);
    }
    ambientes[nombre] = amb;
  }
  console.log(`  ✓ Ambientes (${ambientesData.length})`);

  // ── Personas ────────────────────────────────────────────────────────────
  const personaRepo = epsasDs.getRepository(Persona);

  interface PersonaInput {
    nombre: string; apellido: string; cedula: number; tipoDoc: string;
    correo: string; telefono?: number; genero: string; cargo: string;
    esLider: boolean; esTransversal: boolean; areaLiderada?: string;
  }

  const personasData: PersonaInput[] = [
    // Admin
    {
      nombre: 'Admin', apellido: 'Chronogest', cedula: 134345367, tipoDoc: 'CC',
      correo: 'admin@gmail.com', genero: 'femenino', cargo: 'administrador',
      esLider: false, esTransversal: false,
    },
    // Instructores
    {
      nombre: 'Diego', apellido: 'Calderon', cedula: 132543453, tipoDoc: 'CC',
      correo: 'diego@gmail.com', genero: 'masculino', cargo: 'instructor',
      esLider: true, esTransversal: false, areaLiderada: 'TIC',
    },
    {
      nombre: 'Wilson', apellido: 'Martinez', cedula: 1721872823, tipoDoc: 'CC',
      correo: 'wilson@gmail.com', genero: 'masculino', cargo: 'instructor',
      esLider: false, esTransversal: false,
    },
    {
      nombre: 'Elvis', apellido: 'Diaz', cedula: 12232422, tipoDoc: 'CC',
      correo: 'elvis@gmail.com', genero: 'masculino', cargo: 'instructor',
      esLider: false, esTransversal: true,
    },
    {
      nombre: 'Janier', apellido: 'Ballesteros', cedula: 1879827932, tipoDoc: 'CC',
      correo: 'janier@gmail.com', genero: 'masculino', cargo: 'instructor',
      esLider: false, esTransversal: false,
    },
    {
      nombre: 'Fabian Hernando', apellido: 'Erazo Ruiz', cedula: 134554354, tipoDoc: 'CC',
      correo: 'fabian@gmail.com', genero: 'masculino', cargo: 'instructor',
      esLider: false, esTransversal: false,
    },
    {
      nombre: 'Carlos Andres', apellido: 'Arcos', cedula: 10045332, tipoDoc: 'CC',
      correo: 'Carlosandres@gmail.com', telefono: 316043232, genero: 'masculino', cargo: 'instructor',
      esLider: false, esTransversal: false,
    },
    {
      nombre: 'Henry', apellido: 'Jimenez', cedula: 10544343, tipoDoc: 'CC',
      correo: 'Henry@gmail.com', telefono: 3124213231, genero: 'masculino', cargo: 'instructor',
      esLider: false, esTransversal: false,
    },
    // Aprendiz
    {
      nombre: 'Nilson Andres', apellido: 'Coronado Murcia', cedula: 1078826859, tipoDoc: 'CC',
      correo: 'nilsonmurcia36@gmail.com', genero: 'masculino', cargo: 'aprendiz',
      esLider: false, esTransversal: false,
    },
  ];

  // Contraseñas en texto plano (para seeds de dev) — tomar del backup
  // Los hash del backup son bcrypt con salt=10, los reutilizamos directamente.
  const passwordHashMap: Record<string, string> = {
    'admin@gmail.com':           '$2b$10$meDXjzx22yoHAaHGs8arC.epSA1iwKkXSE8gdg8VtJxl7PZjMCZ8C', // Admin2026
    'diego@gmail.com':           '$2b$10$rYIRgP1sIbrzUNJ8w5ucAeU1aGwbkOiZo1foCGP/YlIIfL.emL1ya', // Diego2026
    'wilson@gmail.com':          '$2b$10$.8GFknYb.DoExiDcy5okleGN6agDPtreCRyaLENXk8kAqfrO.byaa', // Wilson2026
    'elvis@gmail.com':           '$2b$10$QfcI1o3vcbni299J2GTiU.FGHcWQge1JNSmT2OIRKNkpqGrb35pJe', // Elvis2026
    'janier@gmail.com':          '$2b$10$NoPqs/l9LiloOwt2FK2gqu6y6AeenOXT.v2RD5w2LWEiUriDwpXm.', // Janier2026
    'fabian@gmail.com':          '$2b$10$LBhDby4wclctme/W4mMflu4diMjxk4MfbMidfD9ceBoLQuimbBfXm', // Fabian2026
    'Carlosandres@gmail.com':    '$2b$10$2XHgZLsX9dfeDti61hxmCu3sBP42ubR5f1Csy2h9zFBTZpJRUrZfe', // Carlos2026
    'Henry@gmail.com':           '$2b$10$khf/.Gbo8R2NxDiMHZ.WXuXevaskRtgeEjPvN05xAB.YmsoDyW6Gm', // Henry2026
    'nilsonmurcia36@gmail.com':  '$2b$10$uYMNXD3KrWLJh5mHUxgNCODFN4MILF2xgCsAkYp/0UaoitxbYV1L2', // Nilson2026
  };

  const personas: Record<string, Persona> = {};
  for (const p of personasData) {
    let persona = await personaRepo.findOne({ where: { cedula: p.cedula } as any });
    if (!persona) {
      persona = personaRepo.create({
        nombre: p.nombre, apellido: p.apellido,
        cedula: p.cedula, tipoDoc: p.tipoDoc,
        correo: p.correo,
        telefono: p.telefono as any,
        genero: p.genero as any, cargo: p.cargo as any,
        estado: 'activo' as any,
        esLider: p.esLider, esTransversal: p.esTransversal,
        areaLiderada: p.areaLiderada ?? null,
        municipio: { idMunicipio: pitalId } as any,
      } as any);
      await personaRepo.save(persona);
    }
    personas[p.correo] = persona;
  }
  console.log(`  ✓ Personas (${personasData.length})`);

  // ── Programas de fichas activas ─────────────────────────────────────────
  const progADS  = programas['Analisis y desarrollo de software'];
  const progAGRO = programas['Producción Agropecuaria Ecológica'];

  // ── Fichas (Cursos) ─────────────────────────────────────────────────────
  const cursoRepo = epsasDs.getRepository(Curso);

  const fichasData = [
    {
      codigo: '3063290', fechaInicio: '2024-10-15', fechaFin: '2027-01-21', finLectiva: '2026-07-22',
      area: 'TIC', programa: 'Analisis y desarrollo de software', ambiente: 'Ambiente Y12',
      lider: 'diego@gmail.com',
    },
    {
      codigo: '3144062', fechaInicio: '2024-12-09', fechaFin: '2026-12-08', finLectiva: '2026-06-08',
      area: 'Agropecuario', programa: 'Producción Agropecuaria Ecológica', ambiente: 'Ambiente Y1',
      lider: 'Carlosandres@gmail.com',
    },
    {
      codigo: '3145649', fechaInicio: '2024-12-09', fechaFin: '2026-12-08', finLectiva: '2026-06-08',
      area: 'Agropecuario', programa: 'Producción Agropecuaria Ecológica', ambiente: 'Ambiente Y2',
      lider: 'Henry@gmail.com',
    },
  ];

  const fichas: Record<string, Curso> = {};
  for (const f of fichasData) {
    let curso = await cursoRepo.findOne({ where: { codigo: f.codigo } as any });
    if (!curso) {
      const areaEntity = areas[f.area];
      const progEntity = programas[f.programa];
      const liderEntity = personas[f.lider];
      const ambienteEntity = ambientes[f.ambiente];
      curso = cursoRepo.create({
        codigo: f.codigo,
        fechaInicio: f.fechaInicio as any,
        fechaFin: f.fechaFin as any,
        finLectiva: f.finLectiva as any,
        estado: 'activo' as any,
        area:      areaEntity    ? { idArea: (areaEntity as any).idArea } as any : undefined,
        programa:  progEntity    ? { idPrograma: (progEntity as any).idPrograma } as any : undefined,
        lider:     liderEntity   ? { idPersona: (liderEntity as any).idPersona } as any : undefined,
        ambiente:  ambienteEntity ? { idAmbiente: (ambienteEntity as any).idAmbiente } as any : undefined,
      } as any);
      await cursoRepo.save(curso);
    }
    fichas[f.codigo] = curso;
  }
  console.log('  ✓ Fichas: 3063290 (ADSO/TIC), 3144062 y 3145649 (Agropecuario)');

  // Asignar fichaId a la persona aprendiz
  const aprendizPersona = personas['nilsonmurcia36@gmail.com'];
  const fichaADSO = fichas['3063290'];
  if (aprendizPersona && fichaADSO && !(aprendizPersona as any).fichaId) {
    (aprendizPersona as any).fichaId = (fichaADSO as any).idCurso;
    await personaRepo.save(aprendizPersona);
  }

  // ── Usuarios + Credenciales ─────────────────────────────────────────────
  const usuarioRepo  = epsasDs.getRepository(Usuario);
  const credRepo     = epsasDs.getRepository(Credencial);

  const cargoRolMap: Record<string, string> = {
    administrador: 'administrador', instructor: 'instructor', aprendiz: 'aprendiz',
  };

  for (const p of personasData) {
    const persona = personas[p.correo];
    if (!persona) continue;

    // Verificar si ya tiene usuario+credencial
    const credExist = await credRepo.findOne({ where: { login: p.correo } as any });
    if (credExist) continue;

    // Crear usuario
    const usuario = usuarioRepo.create({
      estado: 'activo',
      persona: { idPersona: (persona as any).idPersona } as any,
      aplicativo: { idAplicativo: appId } as any,
    } as any);
    await usuarioRepo.save(usuario);

    // Credencial
    const rolNombre = cargoRolMap[p.cargo] ?? 'aprendiz';
    const rol = roles[rolNombre];
    const cred = credRepo.create({
      login: p.correo,
      password: passwordHashMap[p.correo] ?? await hash('Sena2026!'),
      rol: rol ? { idRol: (rol as any).idRol } as any : undefined,
      usuario: { idUsuario: (usuario as any).idUsuario } as any,
    } as any);
    await credRepo.save(cred);
  }
  console.log('  ✓ Usuarios y credenciales');

  // ── Matrículas ──────────────────────────────────────────────────────────
  const matriculaRepo = epsasDs.getRepository(Matricula);
  const aprendiz = personas['nilsonmurcia36@gmail.com'];
  const fichaAdso = fichas['3063290'];
  if (aprendiz && fichaAdso) {
    const matExist = await matriculaRepo.findOne({
      where: {
        idPersona: (aprendiz as any).idPersona,
        idCurso: (fichaAdso as any).idCurso,
      } as any,
    });
    if (!matExist) {
      const mat = matriculaRepo.create({
        persona: { idPersona: (aprendiz as any).idPersona } as any,
        curso: { idCurso: (fichaAdso as any).idCurso } as any,
        estado: 'activo' as any,
        fechaMatricula: '2026-04-22',
      } as any);
      await matriculaRepo.save(mat);
    }
  }
  console.log('  ✓ Matrícula: Nilson → Ficha 3063290');

  return { personas, fichas, ambientes, appId };
}

// ────────────────────────────────────────────────────────────────────────────

async function seedHorarios(
  horariosDs: DataSource,
  context: { personas: Record<string, Persona>; fichas: Record<string, Curso>; ambientes: Record<string, Ambiente> },
) {
  console.log('\n[3/3] Seeding horarios_db...');

  const horarioRepo  = horariosDs.getRepository(Horario);
  const asigRepo     = horariosDs.getRepository(AsignacionHorario);
  const compRepo     = horariosDs.getRepository(Competencia);

  const { personas, fichas, ambientes } = context;
  const instructor = personas['diego@gmail.com'];     // Diego Calderon — instructor lider ADSO
  const fichaAdso  = fichas['3063290'];
  const ambY12     = ambientes['Ambiente Y12'];

  if (!instructor || !fichaAdso || !ambY12) {
    console.log('  ! Datos de referencia no encontrados — horario omitido');
    return;
  }

  const instructorId = (instructor as any).idPersona;
  const fichaId      = (fichaAdso as any).idCurso;
  const ambienteId   = (ambY12 as any).idAmbiente;

  // Horario del backup: miércoles mañana 07:00-12:00
  let horario = await horarioRepo.findOne({ where: { diaSemana: 'miercoles', jornada: 'manana', horaInicio: '07:00:00' } as any });
  if (!horario) {
    horario = horarioRepo.create({
      diaSemana: 'miercoles', jornada: 'manana',
      horaInicio: '07:00:00', horaFin: '12:00:00',
    } as any);
    await horarioRepo.save(horario);
  }
  const horarioId = (horario as any).id;

  // Asignación
  let asig = await asigRepo.findOne({ where: { horarioId, fichaId, instructorId } as any });
  if (!asig) {
    asig = asigRepo.create({
      horario: { id: horarioId } as any,
      fichaId, ambienteId, instructorId,
      activo: false, minutosRetraso: 0,
    } as any);
    await asigRepo.save(asig);
  }
  const asigId = (asig as any).id;
  console.log('  ✓ Horario: Miércoles mañana 07:00-12:00 (ADSO / Diego / Y12)');

  // Competencia del backup
  const compExist = await compRepo.findOne({ where: { asignacionId: asigId, nombre: 'Automatizacion IA' } as any });
  if (!compExist) {
    const comp = compRepo.create({
      asignacion: { id: asigId } as any,
      instructorId, fichaId,
      nombre: 'Automatizacion IA',
      resultados: ['Chat bot en whatsApp'],
      fechaInicio: '2026-04-06',
      fechaFin: '2026-05-27',
      diasClase: ['2026-04-06','2026-04-13','2026-04-20','2026-04-27','2026-05-06','2026-05-20','2026-05-27'],
    } as any);
    await compRepo.save(comp);
  }
  console.log('  ✓ Competencia: Automatizacion IA');
}

// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('ChronoGest — Seed completo (estado actual del proyecto)');
  console.log('='.repeat(60));
  console.log(`Host: ${PG_HOST}:${PG_PORT}`);

  // 1. Master DB
  const masterDs = ds('chronogest_master_db', [CentroTenant, RootUser]);
  await masterDs.initialize();
  await seedMaster(masterDs);
  await masterDs.destroy();

  // 2. epsas_db
  const epsasDs = ds('epsas_db', [
    Aplicativo, Rol, Modulo, Departamento, Municipio, CentroFormacion,
    Sede, Area, Programa, Ambiente, Persona, Usuario, Credencial, Curso, Matricula,
  ]);
  await epsasDs.initialize();
  const context = await seedEpsas(epsasDs);
  await epsasDs.destroy();

  // 3. horarios_db
  const horariosDs = ds('horarios_db', [Horario, AsignacionHorario, Competencia]);
  await horariosDs.initialize();
  await seedHorarios(horariosDs, context);
  await horariosDs.destroy();

  console.log('\n' + '='.repeat(60));
  console.log('Seed completado. Credenciales de acceso:');
  console.log('─'.repeat(60));
  console.log('SUPER ADMIN   admin@chronogest.com    / Admin1234!');
  console.log('─'.repeat(60));
  console.log('ADMIN         admin@gmail.com         / (hash del backup)');
  console.log('INSTRUCTOR    diego@gmail.com         / (hash del backup)');
  console.log('INSTRUCTOR    wilson@gmail.com        / (hash del backup)');
  console.log('INSTRUCTOR    elvis@gmail.com         / (hash del backup)');
  console.log('INSTRUCTOR    janier@gmail.com        / (hash del backup)');
  console.log('INSTRUCTOR    fabian@gmail.com        / (hash del backup)');
  console.log('INSTRUCTOR    Carlosandres@gmail.com  / (hash del backup)');
  console.log('INSTRUCTOR    Henry@gmail.com         / (hash del backup)');
  console.log('APRENDIZ      nilsonmurcia36@gmail.com / (hash del backup)');
  console.log('─'.repeat(60));
  console.log('Nota: los hashes provienen del backup MySQL original.');
  console.log('Si necesitas resetear contraseñas usa seed-root-user.ts');
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('\n[ERROR]', err.message ?? err);
  process.exit(1);
});
