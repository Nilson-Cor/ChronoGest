/**
 * seed-full.ts — Seed completo del estado actual del proyecto ChronoGest
 *
 * Datos reales extraídos directamente de la base de datos PostgreSQL
 * (epsas_db) — 78 personas, 26 ambientes, 24 programas, 5 áreas, 44 fichas.
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-full.ts
 *
 * El script es IDEMPOTENTE: si ya existen datos los omite (upsert por
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
const PG_USER = process.env.DB_USER ?? process.env.DB_USERNAME ?? process.env.MASTER_DB_USER ?? 'postgres';
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

  const rootPassword = await hash('Admin1234!');
  await upsertOne(rootRepo, { email: 'admin@chronogest.com' } as any, {
    password: rootPassword,
  } as any);
  console.log('  ✓ Root user: admin@chronogest.com / Admin1234!');

  await upsertOne(tenantRepo, { slug: 'default' } as any, {
    nombre:         'Centro de Gestión y Desarrollo Surcolombiano',
    dominio:        'cgds.sena.edu.co',
    estado:         'activo',
    epsasDbName:    'epsas_db',
    epsasDbHost:    PG_HOST,
    epsasDbPort:    PG_PORT,
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

  // ── Áreas (nombres exactos del sistema) ─────────────────────────────────
  const areaRepo = epsasDs.getRepository(Area);
  const areasData = ['Agropecuario', 'AMBIENTAL', 'CONSTRUCCION', 'TICS', 'TURISMO'];
  const areas: Record<string, Area> = {};
  for (const nombre of areasData) {
    let area = await areaRepo.findOne({ where: { nombre } as any });
    if (!area) {
      area = areaRepo.create({ nombre, sede: { idSede: sedeId } as any } as any);
      await areaRepo.save(area);
    }
    areas[nombre] = area;
  }
  console.log(`  ✓ Áreas (${areasData.length}): ${areasData.join(', ')}`);

  // ── Programas (nombres exactos del sistema) ──────────────────────────────
  const progRepo = epsasDs.getRepository(Programa);
  const programasData: Array<{ nombre: string; tipo: string }> = [
    { nombre: 'Analisis y Desarrollo de Software',                                       tipo: 'tecnologo'  },
    { nombre: 'ANALISIS Y DESARROLLO DE SOFTWARE.',                                      tipo: 'tecnologo'  },
    { nombre: 'CATASTRO',                                                                tipo: 'tecnico'    },
    { nombre: 'COCINA.',                                                                 tipo: 'tecnico'    },
    { nombre: 'CONSTRUCCION DE EDIFICACIONES',                                           tipo: 'tecnico'    },
    { nombre: 'CONSTRUCCION DE INFRAESTRUCTURA VIAL',                                    tipo: 'tecnologo'  },
    { nombre: 'CONSTRUCCION, MANTENIMIENTO Y REPARACION DE ESTRUCTURAS EN GUADUA',       tipo: 'tecnico'    },
    { nombre: 'DIBUJO ARQUITECTÓNICO',                                                   tipo: 'tecnico'    },
    { nombre: 'EJECUCION DE CLASES GRUPALES ORIENTADAS AL FITNESS',                      tipo: 'tecnico'    },
    { nombre: 'GESTION AGROEMPRESARIAL',                                                 tipo: 'tecnologo'  },
    { nombre: 'GESTIÓN DE EMPRESAS AGROPECUARIAS',                                       tipo: 'tecnologo'  },
    { nombre: 'GESTIÓN DE RECURSOS NATURALES',                                           tipo: 'tecnologo'  },
    { nombre: 'GESTION DE REDES DE DATOS',                                               tipo: 'tecnologo'  },
    { nombre: 'INSTALACION DE SISTEMAS ELECTRICOS RESIDENCIALES Y COMERCIALES',          tipo: 'tecnico'    },
    { nombre: 'LABORES DE CAMPO EN CULTIVOS',                                            tipo: 'curso_corto'},
    { nombre: 'MANEJO DE LA PRODUCCION PECUARIA',                                        tipo: 'curso_corto'},
    { nombre: 'PREVENCION Y CONTROL AMBIENTAL',                                          tipo: 'tecnologo'  },
    { nombre: 'Producción Agropecuaria Ecológica',                                       tipo: 'tecnologo'  },
    { nombre: 'PRODUCCIÓN DE CAFÉS ESPECIALES',                                          tipo: 'tecnico'    },
    { nombre: 'PRODUCCION DE MULTIMEDIA',                                                tipo: 'tecnologo'  },
    { nombre: 'PRODUCCION PECUARIA.',                                                    tipo: 'tecnico'    },
    { nombre: 'PROMOTORIA CAMPESINA EN AGROECOLOGIA',                                    tipo: 'tecnico'    },
    { nombre: 'SERVICIOS DE BARISMO',                                                    tipo: 'tecnico'    },
    { nombre: 'TECNICO EN OPERACIONES FORESTALES.',                                      tipo: 'tecnico'    },
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

  // ── Ambientes (26 — datos reales del sistema) ────────────────────────────
  const ambRepo = epsasDs.getRepository(Ambiente);
  const ambientesData: Array<{ nombre: string; capacidad: number; tipo: string; area?: string }> = [
    { nombre: 'Ambiente ACEVEDO',     capacidad: 25,  tipo: 'Ambiente',          area: 'CONSTRUCCION' },
    { nombre: 'Ambiente ISNOS',       capacidad: 25,  tipo: 'Ambiente',          area: 'CONSTRUCCION' },
    { nombre: 'Ambiente NOCTURNO',    capacidad: 25,  tipo: 'Ambiente',          area: 'CONSTRUCCION' },
    { nombre: 'Ambiente SAN AGUSTÍN', capacidad: 25,  tipo: 'Ambiente',          area: 'CONSTRUCCION' },
    { nombre: 'Ambiente Y1',          capacidad: 25,  tipo: 'Ambiente',          area: 'Agropecuario' },
    { nombre: 'Ambiente Y12',         capacidad: 30,  tipo: 'Ambiente',          area: 'TICS'         },
    { nombre: 'Ambiente Y13',         capacidad: 25,  tipo: 'Ambiente',          area: 'TICS'         },
    { nombre: 'Ambiente Y14',         capacidad: 25,  tipo: 'Ambiente',          area: 'TICS'         },
    { nombre: 'Ambiente Y15',         capacidad: 25,  tipo: 'Ambiente',          area: 'TICS'         },
    { nombre: 'Ambiente Y18',         capacidad: 25,  tipo: 'Ambiente',          area: 'TURISMO'      },
    { nombre: 'Ambiente Y19',         capacidad: 25,  tipo: 'Ambiente',          area: 'TURISMO'      },
    { nombre: 'Ambiente Y2',          capacidad: 25,  tipo: 'Ambiente',          area: 'Agropecuario' },
    { nombre: 'Ambiente Y25',         capacidad: 25,  tipo: 'Ambiente',          area: 'CONSTRUCCION' },
    { nombre: 'Ambiente Y26',         capacidad: 25,  tipo: 'Ambiente',          area: 'AMBIENTAL'    },
    { nombre: 'Ambiente Y27',         capacidad: 25,  tipo: 'Ambiente',          area: 'AMBIENTAL'    },
    { nombre: 'Ambiente Y29',         capacidad: 25,  tipo: 'Ambiente',          area: 'CONSTRUCCION' },
    { nombre: 'Ambiente Y3',          capacidad: 25,  tipo: 'Ambiente',          area: 'Agropecuario' },
    { nombre: 'Ambiente Y4',          capacidad: 25,  tipo: 'Ambiente',          area: 'Agropecuario' },
    { nombre: 'Ambiente Y5',          capacidad: 25,  tipo: 'Ambiente',          area: 'Agropecuario' },
    { nombre: 'Ambiente Y7',          capacidad: 25,  tipo: 'Ambiente',          area: 'Agropecuario' },
    { nombre: 'Ambiente Y8',          capacidad: 25,  tipo: 'Ambiente',          area: 'Agropecuario' },
    { nombre: 'Auditorio del café',   capacidad: 150, tipo: 'auditorio'                               },
    { nombre: 'Biblioteca',           capacidad: 35,  tipo: 'biblioteca'                              },
    { nombre: 'Bio Auditorio',        capacidad: 100, tipo: 'auditorio'                               },
    { nombre: 'Centro Deportivo',     capacidad: 80,  tipo: 'centro_deportivo'                        },
    { nombre: 'Restaurante',          capacidad: 100, tipo: 'restaurante'                             },
  ];
  const ambientes: Record<string, Ambiente> = {};
  for (const { nombre, capacidad, tipo, area } of ambientesData) {
    let amb = await ambRepo.findOne({ where: { nombre } as any });
    if (!amb) {
      amb = ambRepo.create({
        nombre, capacidad, tipo, estado: 'activo',
        sede:      { idSede: sedeId } as any,
        municipio: { idMunicipio: pitalId } as any,
        area: area && areas[area] ? { idArea: (areas[area] as any).idArea } as any : undefined,
      } as any);
      await ambRepo.save(amb);
    }
    ambientes[nombre] = amb;
  }
  console.log(`  ✓ Ambientes (${ambientesData.length})`);

  // ── Personas (78 — datos reales del sistema) ─────────────────────────────
  const personaRepo = epsasDs.getRepository(Persona);

  interface PersonaInput {
    nombre: string; apellido: string; cedula: number; tipoDoc: string;
    correo: string; telefono?: number; genero: string; cargo: string;
    esLider: boolean; esTransversal: boolean; areaLiderada?: string;
  }

  const personasData: PersonaInput[] = [
    // ── Administradores ──────────────────────────────────────────────────
    { nombre: 'Administrador', apellido: 'Sistema',                 cedula: 1000000001, tipoDoc: 'CC', correo: 'admin@gmail.com',             genero: 'masculino', cargo: 'administrador', esLider: false, esTransversal: false },
    { nombre: 'admin2',        apellido: 'chronogest',              cedula:  126621762, tipoDoc: 'CC', correo: 'admin2@gmail.com',            genero: 'M',         cargo: 'administrador', esLider: false, esTransversal: false, telefono: 3652525665 },
    // ── Aprendices ───────────────────────────────────────────────────────
    { nombre: 'Nilson Andres', apellido: 'Coronado Murcia',         cedula: 3232900755, tipoDoc: 'CC', correo: 'nilsonmurcia36@gmail.com',    genero: 'M',         cargo: 'aprendiz',      esLider: false, esTransversal: false, telefono: 3232900755 },
    { nombre: 'Aprendiz',      apellido: 'ddd',                     cedula:  123456789, tipoDoc: 'CC', correo: 'aprendiz@gmail.com',          genero: 'M',         cargo: 'aprendiz',      esLider: false, esTransversal: false, telefono: 365256256265 },
    { nombre: 'Martina',       apellido: 'Perez',                   cedula:   12761672, tipoDoc: 'CC', correo: 'martina@gmail.com',           genero: 'F',         cargo: 'aprendiz',      esLider: false, esTransversal: false, telefono: 3225155665 },
    // ── Instructores ─────────────────────────────────────────────────────
    { nombre: 'Carlos',            apellido: 'Alberto Bravo Zuñiga',      cedula:   12240483, tipoDoc: 'CC', correo: 'carloszuniga@gmail.com',      genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000037 },
    { nombre: 'Carlos',            apellido: 'Alberto Sanchez Cruz',       cedula:   16186627, tipoDoc: 'CC', correo: 'carloscruz@gmail.com',        genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000042 },
    { nombre: 'Diego',             apellido: 'Alejandro Gaviria Lozano',   cedula: 1020737788, tipoDoc: 'CC', correo: 'diegolozano@gmail.com',       genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000038 },
    { nombre: 'Juan',              apellido: 'Alexander Lugo',             cedula:   83090551, tipoDoc: 'CC', correo: 'juanlugo@gmail.com',          genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000068 },
    { nombre: 'Jaime',             apellido: 'Alfonso Artunduaga Murcia',  cedula: 1083879354, tipoDoc: 'CC', correo: 'jaimemurcia@gmail.com',       genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000017 },
    { nombre: 'Manuel',            apellido: 'Alfonso Rincon',             cedula:   83232445, tipoDoc: 'CC', correo: 'manuelrincon@gmail.com',      genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000069 },
    { nombre: 'Steven',            apellido: 'Alonso Barrera',             cedula: 1098720670, tipoDoc: 'CC', correo: 'stevenbarrera@gmail.com',     genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000030 },
    { nombre: 'John',              apellido: 'Anderson Morales Chavez',    cedula: 1083909697, tipoDoc: 'CC', correo: 'johnchavez@gmail.com',        genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000022 },
    { nombre: 'Silvia',            apellido: 'Andrea Forrero Artunduaga',  cedula:   36287662, tipoDoc: 'CC', correo: 'silviaartunduaga@gmail.com',  genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000048 },
    { nombre: 'Yenniffer',         apellido: 'Andrea Ospina Gomez',        cedula: 1026289970, tipoDoc: 'CC', correo: 'yenniffergomez@gmail.com',    genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000001 },
    { nombre: 'Paola',             apellido: 'Andrea Villalobos Lopez',    cedula: 1083878397, tipoDoc: 'CC', correo: 'paolalopez@gmail.com',        genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000016 },
    { nombre: 'Carlos',            apellido: 'Andres Arcos Avila',         cedula:   83042763, tipoDoc: 'CC', correo: 'carlosavila@gmail.com',       genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000066 },
    { nombre: 'Janier',            apellido: 'Andres Ballesteros Rincon',  cedula: 1065204337, tipoDoc: 'CC', correo: 'janierrincon@gmail.com',      genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000006 },
    { nombre: 'Camilo',            apellido: 'Andres Guzman',              cedula: 1083871254, tipoDoc: 'CC', correo: 'camiloguzman@gmail.com',      genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000014 },
    { nombre: 'Nicolás',           apellido: 'Andres Meneses',             cedula: 1083920822, tipoDoc: 'CC', correo: 'nicolasmeneses@gmail.com',    genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000024 },
    { nombre: 'Sergio',            apellido: 'Andres Quigua Almendra',     cedula: 1061715977, tipoDoc: 'CC', correo: 'sergioalmendra@gmail.com',    genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000003 },
    { nombre: 'Yamid',             apellido: 'Andres Viuche',              cedula:   83043469, tipoDoc: 'CC', correo: 'yamidviuche@gmail.com',       genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000067 },
    { nombre: 'Carlos Andres',     apellido: 'Arcos',                      cedula: 1726727652, tipoDoc: 'CC', correo: 'carlosarcos@gmail.com',       genero: 'masculino', cargo: 'instructor', esLider: true,  esTransversal: true,  areaLiderada: 'Agropecuario', telefono: 3425526627 },
    { nombre: 'Yony',              apellido: 'Arley Chavez Parra',         cedula:   10633441, tipoDoc: 'CC', correo: 'yonyparra@gmail.com',         genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000005 },
    { nombre: 'Edwar',             apellido: 'Arley Vergara Calderon',     cedula: 1083899583, tipoDoc: 'CC', correo: 'edwarcalderon@gmail.com',     genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000020 },
    { nombre: 'Cristian',          apellido: 'Camilo Villarreal Medina',   cedula:   83258052, tipoDoc: 'CC', correo: 'cristianmedina@gmail.com',    genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000070 },
    { nombre: 'Juan',              apellido: 'Carlos Angel Casanova',      cedula:   12271481, tipoDoc: 'CC', correo: 'juancasanova@gmail.com',      genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000041 },
    { nombre: 'Juan',              apellido: 'Carlos Gomez Ortega',        cedula:   74186754, tipoDoc: 'CC', correo: 'juanortega@gmail.com',        genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000060 },
    { nombre: 'Martha',            apellido: 'Cecilia Camacho Peña',       cedula:   40781859, tipoDoc: 'CC', correo: 'marthapena@gmail.com',        genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000052 },
    { nombre: 'Julio',             apellido: 'Cesar Ordoñez Manzano',      cedula:   12144322, tipoDoc: 'CC', correo: 'juliomanzano@gmail.com',      genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000035 },
    { nombre: 'Wilmer',            apellido: 'Collazos Jiménez',           cedula:   12266626, tipoDoc: 'CC', correo: 'wilmerjimenez@gmail.com',     genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000040 },
    { nombre: 'Norma',             apellido: 'Constanza Perez Benavides',  cedula:   36288847, tipoDoc: 'CC', correo: 'normabenavides@gmail.com',    genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000049 },
    { nombre: 'Arelis',            apellido: 'Criollo Criollo',            cedula:   26493042, tipoDoc: 'CC', correo: 'areliscriollo@gmail.com',     genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000045 },
    { nombre: 'Hermes',            apellido: 'Daniel Ñañez Muñoz',         cedula: 1084260045, tipoDoc: 'CC', correo: 'hermesmunoz@gmail.com',       genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000026 },
    { nombre: 'Elvis',             apellido: 'Donnovan Diaz Araujo',       cedula: 1085335224, tipoDoc: 'CC', correo: 'elvisaraujo@gmail.com',       genero: 'masculino', cargo: 'instructor', esLider: true,  esTransversal: true,  areaLiderada: 'TURISMO',      telefono: 3100000072 },
    { nombre: 'Henry',             apellido: 'Eduardo Jimenez',            cedula:   80024505, tipoDoc: 'CC', correo: 'henryjimenez@gmail.com',      genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000064 },
    { nombre: 'John',              apellido: 'Edwin Montilla Berna',       cedula: 1077858481, tipoDoc: 'CC', correo: 'johnberna@gmail.com',         genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000009 },
    { nombre: 'Rosa',              apellido: 'Elvira Gaviria',             cedula: 1061707811, tipoDoc: 'CC', correo: 'rosagaviria@gmail.com',       genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000002 },
    { nombre: 'Luisa',             apellido: 'Fernanda Sarmiento Rivera',  cedula:   55065750, tipoDoc: 'CC', correo: 'luisarivera@gmail.com',       genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000057 },
    { nombre: 'Diego',             apellido: 'Fernando Calderón Silva',    cedula: 1094914260, tipoDoc: 'CC', correo: 'diegosilva@gmail.com',        genero: 'masculino', cargo: 'instructor', esLider: true,  esTransversal: false, areaLiderada: 'TICS',         telefono: 3100000029 },
    { nombre: 'Yeison',            apellido: 'Fernando Lievano Cabezas',   cedula: 1078752091, tipoDoc: 'CC', correo: 'yeisoncabezas@gmail.com',     genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000010 },
    { nombre: 'Nixon',             apellido: 'German Diaz Muñoz',          cedula: 1082773486, tipoDoc: 'CC', correo: 'nixonmunoz@gmail.com',        genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000011 },
    { nombre: 'Diana',             apellido: 'Grissell Vergara Calderón',  cedula: 1083904837, tipoDoc: 'CC', correo: 'dianacalderon@gmail.com',     genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000021 },
    { nombre: 'Fabián',            apellido: 'Hernando Erazo Ruiz',        cedula:   83042339, tipoDoc: 'CC', correo: 'fabianruiz@gmail.com',        genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000065 },
    { nombre: 'Yesid',             apellido: 'Hernando Ramirez Daza',      cedula: 1085274569, tipoDoc: 'CC', correo: 'yesiddaza@gmail.com',         genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000027 },
    { nombre: 'Felix',             apellido: 'Humberto Carlosama',         cedula:    4929421, tipoDoc: 'CC', correo: 'felixcarlosama@gmail.com',    genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000053 },
    { nombre: 'Javier',            apellido: 'Humberto Giraldo Jimenez',   cedula: 1083886304, tipoDoc: 'CC', correo: 'javierjimenez@gmail.com',     genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000019 },
    { nombre: 'Daniel',            apellido: 'Humberto Novoa Vaca',        cedula:   19493629, tipoDoc: 'CC', correo: 'danielvaca@gmail.com',        genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000044 },
    { nombre: 'Néstor',            apellido: 'Julian Castillo Parra',      cedula: 1075297000, tipoDoc: 'CC', correo: 'nestorparra@gmail.com',       genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000008 },
    { nombre: 'Yalely',            apellido: 'Lineidy Conde Capera',       cedula:   36067178, tipoDoc: 'CC', correo: 'yalelycapera@gmail.com',      genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000046 },
    { nombre: 'Dario',             apellido: 'Lombana Sabogal',            cedula:   79621973, tipoDoc: 'CC', correo: 'dariosabogal@gmail.com',      genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000063 },
    { nombre: 'Magda',             apellido: 'Lorena Rojas Enriquez',      cedula:   53166356, tipoDoc: 'CC', correo: 'magdaenriquez@gmail.com',     genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000056 },
    { nombre: 'Jose',              apellido: 'Luis Sanchez Oviedo',        cedula: 1083864380, tipoDoc: 'CC', correo: 'joseoviedo@gmail.com',        genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000012 },
    { nombre: 'Juan',              apellido: 'Manuel Silva Chavarro',      cedula: 1083881140, tipoDoc: 'CC', correo: 'juanchavarro@gmail.com',      genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000018 },
    { nombre: 'Diana',             apellido: 'Marcela Diaz Salgado',       cedula:   36295573, tipoDoc: 'CC', correo: 'dianasalgado@gmail.com',      genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000050 },
    { nombre: 'Angelica',          apellido: 'Maria Reyes',                cedula:   36289204, tipoDoc: 'CC', correo: 'angelicareyes@gmail.com',     genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000047 },
    { nombre: 'Miller',            apellido: 'Marino Ordoñez Enciso',      cedula:   12228022, tipoDoc: 'CC', correo: 'millerenciso@gmail.com',      genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000036 },
    { nombre: 'Carlos',            apellido: 'Mario Lopez Anaya',          cedula:   73161334, tipoDoc: 'CC', correo: 'carlosanaya@gmail.com',       genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000059 },
    { nombre: 'Deya',              apellido: 'Maritza Cortes',             cedula:   52953392, tipoDoc: 'CC', correo: 'deyacortes@gmail.com',        genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000055 },
    { nombre: 'Wilson',            apellido: 'Martinez Saldarriaga',       cedula:   96361787, tipoDoc: 'CC', correo: 'wilsonsaldarriaga@gmail.com', genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000071 },
    { nombre: 'Oscar',             apellido: 'Mauricio Bonilla Vasquez',   cedula: 1083874139, tipoDoc: 'CC', correo: 'oscarvasquez@gmail.com',      genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000015 },
    { nombre: 'Jhony',             apellido: 'Mesa Aley',                  cedula: 1117519102, tipoDoc: 'CC', correo: 'jhonyaley@gmail.com',         genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: true,  telefono: 3100000033 },
    { nombre: 'Ana',               apellido: 'Milena Camacho',             cedula: 1117523736, tipoDoc: 'CC', correo: 'anacamacho@gmail.com',        genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000034 },
    { nombre: 'Santiago',          apellido: 'Noriega',                    cedula: 1083924277, tipoDoc: 'CC', correo: 'santiagonoriega@gmail.com',   genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000025 },
    { nombre: 'Jheferson',         apellido: 'Ortiz Vega',                 cedula: 1110515794, tipoDoc: 'CC', correo: 'jhefersonvega@gmail.com',     genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000032 },
    { nombre: 'Anyi',              apellido: 'Paola Bolaños Ordoñez',      cedula: 1061804322, tipoDoc: 'CC', correo: 'anyiordonez@gmail.com',       genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000004 },
    { nombre: 'Diana',             apellido: 'Paola Garcia Ramos',         cedula:   52927516, tipoDoc: 'CC', correo: 'dianaramos@gmail.com',        genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000054 },
    { nombre: 'Saúl',              apellido: 'Ramirez Molano',             cedula:    7724144, tipoDoc: 'CC', correo: 'saulmolano@gmail.com',        genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000061 },
    { nombre: 'Leidy',             apellido: 'Rocio Vargas',               cedula: 1083868695, tipoDoc: 'CC', correo: 'leidyvargas@gmail.com',       genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000013 },
    { nombre: 'Carlos',            apellido: 'Romario Garcia Mejia',       cedula:    7731793, tipoDoc: 'CC', correo: 'carlosmejia@gmail.com',       genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000062 },
    { nombre: 'Juan',              apellido: 'Sebastián Ruiz Suarez',      cedula: 1083919421, tipoDoc: 'CC', correo: 'juansuarez@gmail.com',        genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000023 },
    { nombre: 'Ana',               apellido: 'Silvia Muñoz Martinez',      cedula: 1085688083, tipoDoc: 'CC', correo: 'anamartinez@gmail.com',       genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000028 },
    { nombre: 'Karen',             apellido: 'Sofia Martinez Torres',      cedula:   36297345, tipoDoc: 'CC', correo: 'karentorres@gmail.com',       genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000051 },
    { nombre: 'Karol',             apellido: 'Tatiana Fierro Gutierrez',   cedula: 1110492490, tipoDoc: 'CC', correo: 'karolgutierrez@gmail.com',    genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000031 },
    { nombre: 'Eduardo',           apellido: 'Triana Trujillo',            cedula:   12266571, tipoDoc: 'CC', correo: 'eduardotrujillo@gmail.com',   genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000039 },
    { nombre: 'Carlos',            apellido: 'Uriel Hernandez',            cedula:   19462860, tipoDoc: 'CC', correo: 'carloshernandez@gmail.com',   genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000043 },
    { nombre: 'Jose',              apellido: 'Uriel Salas Londoño',        cedula:    6030646, tipoDoc: 'CC', correo: 'joselondono@gmail.com',       genero: 'masculino', cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000058 },
    { nombre: 'Andrea',            apellido: 'Yiceth Parra Collazos',      cedula: 1075227843, tipoDoc: 'CC', correo: 'andreacollazos@gmail.com',    genero: 'femenino',  cargo: 'instructor', esLider: false, esTransversal: false, telefono: 3100000007 },
  ];

  // Hash reales del sistema (bcrypt del backup)
  const passwordHashMap: Record<string, string> = {
    'admin@gmail.com':             '$2b$10$JRhHP.Ph2Y4vy0tYaToAwu2zMQUyv1s/X1iXIm4OM/bRZNiVhzH0u',
    'admin2@gmail.com':            '$2b$10$CqVQmwIi3L5FvrQXw1vFb.oJcpXsdg1LkFPJgNMYeHDo0.3A9wkD2',
    'nilsonmurcia36@gmail.com':    '$2b$10$katFt.YrdQlYR1V8mIf0TuDlNKj6MyilwdJUx8.zxlO2kQoE7EbV6',
    'aprendiz@gmail.com':          '$2b$10$eHq1BtnrD8zPcnbdHCcbNe6X1ht51il8/i6aZkUZ.otwMbybVkmGq',
    'martina@gmail.com':           '$2b$10$5jrOGI2Hckb9jxzrdxcpguWDN.KnttRf7Hlb7xktw/2pgAc51w3ay',
    'carloszuniga@gmail.com':      '$2b$10$1i8HRYa8FSnZvqdFGN6Dqe84cEblHYE5mYnYd5qGHpUowFKffwSAK',
    'carloscruz@gmail.com':        '$2b$10$P2HmQIZudb8NMtLCzSdsvucQBqcjoUjzCmPsegaWy6MT1K6JB7r8q',
    'diegolozano@gmail.com':       '$2b$10$IDxoMXt22nLCiI8wmeNX/urd5VBD3k/Au7NVC8rrNTAx/DS7MynYq',
    'juanlugo@gmail.com':          '$2b$10$OVmnbaIu8TJpin4/znsOTOaAOlqe6XA0.W48iHqQIlWIi/qgHiFBi',
    'jaimemurcia@gmail.com':       '$2b$10$eE/2ETRWEZCVAwR07do1f.2RIKGilx9U8KQ764eI52BZ3AKgexp/O',
    'manuelrincon@gmail.com':      '$2b$10$tmxhlwdLmucPXKY2.ecRceiyKAygLwELHBww92lP0ylns6RJDqdeC',
    'stevenbarrera@gmail.com':     '$2b$10$jX84kWL9Z837Byi0GRd0xOBZy/Qk7jJxdzfTCCCC4kjBPNYqGL99O',
    'johnchavez@gmail.com':        '$2b$10$g1haGbudNCfyyZVvcv5wPOCGm5tf4E5hjn0iuHBoqcGMWf85X.W86',
    'silviaartunduaga@gmail.com':  '$2b$10$2IAbUBhdvJf5T.dJUbAvJe0dxHzan3ZtI20LdNYDA2.VDYikzJgKm',
    'yenniffergomez@gmail.com':    '$2b$10$m1fvEwBqik3YEvI5Fyf9kOoqVfVu5KBMAOwLQlAQea2hUM.rOlnL6',
    'paolalopez@gmail.com':        '$2b$10$dKV25lhFbSBR83hqs0zfZ.wc0ORlLyd2UNdL9vZLAcJmR/74MFrD6',
    'carlosavila@gmail.com':       '$2b$10$cazWdqmvA3XxRbzBR3ZEWO.R6kdHMds.7N1Dl3d7gxavLIJ2MDy96',
    'janierrincon@gmail.com':      '$2b$10$d2loQC50ANPZTOZSZQXkvePEq5OIKgvjksuQrTN5Fp6fCPIRHRHPS',
    'camiloguzman@gmail.com':      '$2b$10$vAKrSNLf7E5a8R8RzOd9p.9eBhgoen1s/t4bNMj9x17NhUNcKoDdG',
    'nicolasmeneses@gmail.com':    '$2b$10$NXgfcDFYuQZ8HsWPRJozXOqJuvzZHBPLl018tgTqRy081Mmp0f3mO',
    'sergioalmendra@gmail.com':    '$2b$10$lGhRtZ/jaW0iKzcMKOb6lelqrXlNktgxhNsOldRIvwWXZDlTiKnI6',
    'yamidviuche@gmail.com':       '$2b$10$FRbqo4cyXkblxwnR21bROuas0Mfyp5qfCbgiKl4Q4QG/QD1OYOWju',
    'carlosarcos@gmail.com':       '$2b$10$vf1hYdrv.kL2j9aNSnlJF.Vqzyhg854TNjVnU3UeoFrMqRQH.wqhG',
    'yonyparra@gmail.com':         '$2b$10$ptYHNTh8eDgOr/bb6CoQSep2X4.aDt9DoTyTuVCymGUglUxcS4uvW',
    'edwarcalderon@gmail.com':     '$2b$10$nMEm4yn/qRnANtsN6WRI..UtHC9FGKSKC7mTL0LqJG3/IdOKtBLjO',
    'cristianmedina@gmail.com':    '$2b$10$7L9Fqi1tS5GRsOV/j.pMG.2RNZK4OXQ7EiehJ3vtKWOn3wez6e8Tu',
    'juancasanova@gmail.com':      '$2b$10$b/1xRbvERv/zuMquH8zx6.YoqCM.fEWk9Q/gmtO.2gFQKoUY3Sm2a',
    'juanortega@gmail.com':        '$2b$10$AZzWxtKV4gQ2RqVACdzSK.b3NEIEQj1OwbPQGGLQbtXvtrwjJMOx.',
    'marthapena@gmail.com':        '$2b$10$jY5A4q7Bsnu3iIh4wPfqZeHpXN/czjE3TAohxJRQ2letocYPZvM8u',
    'juliomanzano@gmail.com':      '$2b$10$4bWT8kXutlsGXRxXdmONzufwlUofIkjoZ4qb8//3tlgiwBpcsTsoW',
    'wilmerjimenez@gmail.com':     '$2b$10$q3EZ8HKc8dS/ag9wPhB61uxj6yW1tn.1kuHdb1eteD2wjGD5zvsma',
    'normabenavides@gmail.com':    '$2b$10$FEh5wq1s5lycTMkDpY0KjOU8xNJN3EXl6g/jz4GA2K1BZHrR90lWS',
    'areliscriollo@gmail.com':     '$2b$10$7Vajsip0Vnm1Kn36XYYTO.eitJuKwnMELrvlczNKwSDsqUg2CUh3a',
    'hermesmunoz@gmail.com':       '$2b$10$S7DsYpf04WHKeBJ10HGI2e3AWSQjebAsMRVln4uUAG0Qs7q7pmr9u',
    'elvisaraujo@gmail.com':       '$2b$10$.gm.RwCvvDJ.9mHbu.t.DuLM04cReJ0UNyr46rdf7HyYbcs3sZC/6',
    'henryjimenez@gmail.com':      '$2b$10$hY1ScbRjQ/A9R.QTcyS53eYg45ynesgUeQob3Db9mrcvUq7Mjze7y',
    'johnberna@gmail.com':         '$2b$10$NFRkKmIOuBYcPZen/cd8CuHYx0sVoqfz8M/QNlQQQBJQcEgwBEM.O',
    'rosagaviria@gmail.com':       '$2b$10$l2.rzmowNHioe7WzsQ0gfut7grajfW.RwQ/hiApRGn07HPJPg.myO',
    'luisarivera@gmail.com':       '$2b$10$mLNOLoCcgx3eN8p3358FzOVqdPhy.F2T2zQZOOrRAQid4R7Suwlfi',
    'diegosilva@gmail.com':        '$2b$10$VubT/LND6i4wGuTnxY35TuEdp184Cntzm1rbZs.ihaEUmgsORe8tu',
    'yeisoncabezas@gmail.com':     '$2b$10$r05EiNjC39T/rEXZKYD23eymXLwTNws0rANl.Pde9.0SzQiQioCme',
    'nixonmunoz@gmail.com':        '$2b$10$o5zSCtIogOhGaujwyZMWku3N3eIxcM97JT2Mk8ZGM7hFQ536P.4N2',
    'dianacalderon@gmail.com':     '$2b$10$Pnf3FNwlag8nLmvOvvzf.uwrbfvdGebj6/epU2mGAyaPzlRaxw/um',
    'fabianruiz@gmail.com':        '$2b$10$O9z2wGcFaSIYxVFwKkKKpePjMZ067EFw1b.aJayuocgjgyWgkpOfq',
    'yesiddaza@gmail.com':         '$2b$10$FTJftTUk5/eOnAU5xsoDMO9iKfoDIP5vfITaFnBdhyDw0swmLZLnC',
    'felixcarlosama@gmail.com':    '$2b$10$K0aDZoyDxGrYbFAyQ.MGdeOdD8Xt3omsAr0NQ1.bynEj6mYQXY91G',
    'javierjimenez@gmail.com':     '$2b$10$J7EszT2Idhvr9tRVO5tQW.NrbWxCCUjZJ5MAcGkymRVFZeiBNozuy',
    'danielvaca@gmail.com':        '$2b$10$ZzTjDNwltM4ErrKvYWWxyOX/1LBR8R6BRSOiqfYfTWzXqgpMuilSq',
    'nestorparra@gmail.com':       '$2b$10$DfRZzr7T6QPDnk9sBcFdTO7eKJx2ewN6Pjim70/v1B1Coy7W4JQUe',
    'yalelycapera@gmail.com':      '$2b$10$EJXk47q4KQsxGh1pXWaUdOBSGGJkTPVY4/Giuq5M8C9e587HHLxXS',
    'dariosabogal@gmail.com':      '$2b$10$O9ugxLnflNx6UpJqK0Qltu8r9fWlx2i/Ery/X6qLnzR6SMkbmOgGK',
    'magdaenriquez@gmail.com':     '$2b$10$ccR/5N/k6RImBLUgv0pQ3OGMABwiUpeEwJcDW8kvmTsIH2OVg.OVu',
    'joseoviedo@gmail.com':        '$2b$10$8tOl.JIKhkhS1cn.WW9QNe/UcC8Zb0r8MDJXOj1.g1rKzxTiHFa52',
    'juanchavarro@gmail.com':      '$2b$10$Q.sheIgzMDKqMOukoQoR2eF43Qs/WDX7DlX4/KU7gNmjBiukJEnv2',
    'dianasalgado@gmail.com':      '$2b$10$KmmZeY/Hn.ilquyDH3SuUOp2ZCY5mXchCgwmjhrqDzmzabxD0IbAy',
    'angelicareyes@gmail.com':     '$2b$10$uX2rYL7Lkr6VNcQrDzF8u.J8qAuXzj9T7YmvU64acDKInyTqPMynO',
    'millerenciso@gmail.com':      '$2b$10$AAHJMisc5k4Q5jN2b9NqIeTp.l8R218BVy/n18O69z7kraWf3kiIm',
    'carlosanaya@gmail.com':       '$2b$10$9GGLq3R6ja8Vbj6lLJMRtOK4UA0ZDY6UFPlokMnIXMH.v33nbrJFC',
    'deyacortes@gmail.com':        '$2b$10$MwRPgzilLjVXvTArJr4H9.MXrJtzvf7FPrE0jHd0TkpVEDqzK0yx.',
    'wilsonsaldarriaga@gmail.com': '$2b$10$k6uXYZNf8pNsnMMBOqykz.JtW9Alu674LlcNtfkMuFejLQ06JyT.6',
    'oscarvasquez@gmail.com':      '$2b$10$pFSH0Rltq06ggOERIxcxxOwYJs9wQkRw32yQSugdd5FqoEzgW9Rh.',
    'jhonyaley@gmail.com':         '$2b$10$nUHJNwKHDWuBTX71k.p18eOugzjXmoahXDjLH19X2GmbO9CIkH94S',
    'anacamacho@gmail.com':        '$2b$10$433YdBilhoj5Upx3PKkmwuzVryfIvVks51DFrrxAA4g.niXWVd.u.',
    'santiagonoriega@gmail.com':   '$2b$10$Q1UJv9rXaAmK5uoci3BCiOLg7UaQdKxRGGM8PdKl4TbqjLk966J/S',
    'jhefersonvega@gmail.com':     '$2b$10$v8jlcXmwaOpxMDyVrwUtX.VXQsWGvJT2U3DSsJ0FkyiQbPyexTFN2',
    'anyiordonez@gmail.com':       '$2b$10$rzQz0iulUbtSVZsq2EXR.Ow2Jig36isAJfbfFTeT5t1e2JqaQgcT.',
    'dianaramos@gmail.com':        '$2b$10$VPHAMYglXYorceMAU6F5fOcsfy9nbJTtPKLpBTRPOBNglT3dDLmw2',
    'saulmolano@gmail.com':        '$2b$10$jj08rshdjBAoWTxfZ2TFZe.yacvjs3YseOuMG.c89WG0w/THaA16S',
    'leidyvargas@gmail.com':       '$2b$10$BJhq9rYL9jnmHewCKEEGGeO8o3zT8QxU5OjzHAmhbEXwNCZT2G4UO',
    'carlosmejia@gmail.com':       '$2b$10$xdD8lsPasrzBAgYKFAJZa.ev3sHZbgBfMg1Gih6.X8iFUGchgZi6e',
    'juansuarez@gmail.com':        '$2b$10$kH9vOS7EtIS3GGbtZvy.jeQIefRuzC6Hvd9TpYk6eO7SwWjllrpk.',
    'anamartinez@gmail.com':       '$2b$10$hpeFs6mikDopvYq644RvxOG21E1pmLUuzOYuV7GeVbSOnVM3Aig0G',
    'karentorres@gmail.com':       '$2b$10$r.5L06lWhL2VCWZGVIBRPeQJeqPHIp6TZ5hOQljdFxKE2oyqcttuO',
    'karolgutierrez@gmail.com':    '$2b$10$7Q1cnzCZyEre/tRsYk2eSeJd3Cvzrsc86O6shCWCV7qtb8Ifr4N92',
    'eduardotrujillo@gmail.com':   '$2b$10$5bxBiRxAAl3AC0hooBfu5u6d69MTUZKK2YE/e9MmIjkQbHf7dVc0m',
    'carloshernandez@gmail.com':   '$2b$10$ium/GclSAtQu03KAhtcCbuUX66Hi1AMx8Ib1Ls4nn9OfA0iN9C81.',
    'joselondono@gmail.com':       '$2b$10$M0mNvPKN6TaB./dkQ0SftubTH7Ylhf3jTD.vzJ33ig.AkX/lm0ZAK',
    'andreacollazos@gmail.com':    '$2b$10$8b7bFC2vv2m4NC/BOQ31VeoPITgMZJajzlndFVA6YGO7gvh.ydziW',
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

  // ── Fichas / Cursos (44 — datos reales del sistema) ──────────────────────
  const cursoRepo = epsasDs.getRepository(Curso);

  const fichasData: Array<{
    codigo: string; fechaInicio: string; fechaFin: string; finLectiva: string;
    area: string; programa: string; ambiente: string; lider?: string;
  }> = [
    { codigo: '3042663', fechaInicio: '2024-08-20', fechaFin: '2026-11-19', finLectiva: '2026-05-19', area: 'TICS',         programa: 'GESTION DE REDES DE DATOS',                                        ambiente: 'Ambiente Y15' },
    { codigo: '3063290', fechaInicio: '2024-10-15', fechaFin: '2027-02-23', finLectiva: '2026-07-15', area: 'TICS',         programa: 'Analisis y Desarrollo de Software',                                ambiente: 'Ambiente Y15',         lider: 'nicolasmeneses@gmail.com' },
    { codigo: '3063316', fechaInicio: '2024-10-15', fechaFin: '2027-01-14', finLectiva: '2026-07-14', area: 'TICS',         programa: 'ANALISIS Y DESARROLLO DE SOFTWARE.',                               ambiente: 'Ambiente Y12',         lider: 'nicolasmeneses@gmail.com' },
    { codigo: '3121411', fechaInicio: '2024-11-18', fechaFin: '2027-02-17', finLectiva: '2026-08-17', area: 'CONSTRUCCION', programa: 'CONSTRUCCION DE INFRAESTRUCTURA VIAL',                             ambiente: 'Ambiente Y25',         lider: 'dianacalderon@gmail.com' },
    { codigo: '3138722', fechaInicio: '2025-02-10', fechaFin: '2027-02-09', finLectiva: '2026-08-09', area: 'Agropecuario', programa: 'Producción Agropecuaria Ecológica',                                ambiente: 'Ambiente Y4',          lider: 'anyiordonez@gmail.com' },
    { codigo: '3144062', fechaInicio: '2026-01-05', fechaFin: '2028-02-23', finLectiva: '2027-07-21', area: 'Agropecuario', programa: 'Producción Agropecuaria Ecológica',                                ambiente: 'Ambiente Y8',          lider: 'carlosarcos@gmail.com' },
    { codigo: '3144066', fechaInicio: '2024-12-09', fechaFin: '2026-12-08', finLectiva: '2026-06-08', area: 'TICS',         programa: 'PRODUCCION DE MULTIMEDIA',                                         ambiente: 'Ambiente Y14',         lider: 'jhefersonvega@gmail.com' },
    { codigo: '3145329', fechaInicio: '2024-12-12', fechaFin: '2026-12-11', finLectiva: '2026-06-11', area: 'AMBIENTAL',    programa: 'GESTIÓN DE RECURSOS NATURALES',                                    ambiente: 'Ambiente Y27',         lider: 'juanchavarro@gmail.com' },
    { codigo: '3145636', fechaInicio: '2024-12-09', fechaFin: '2027-03-08', finLectiva: '2026-09-08', area: 'TICS',         programa: 'ANALISIS Y DESARROLLO DE SOFTWARE.',                               ambiente: 'Ambiente Y13',         lider: 'elvisaraujo@gmail.com' },
    { codigo: '3145649', fechaInicio: '2024-12-09', fechaFin: '2026-12-08', finLectiva: '2026-06-08', area: 'Agropecuario', programa: 'Producción Agropecuaria Ecológica',                                ambiente: 'Ambiente Y5',          lider: 'sergioalmendra@gmail.com' },
    { codigo: '3145650', fechaInicio: '2024-12-09', fechaFin: '2027-03-08', finLectiva: '2026-09-08', area: 'TICS',         programa: 'ANALISIS Y DESARROLLO DE SOFTWARE.',                               ambiente: 'Ambiente Y12',         lider: 'anamartinez@gmail.com' },
    { codigo: '3169474', fechaInicio: '2025-04-29', fechaFin: '2027-04-28', finLectiva: '2026-10-28', area: 'Agropecuario', programa: 'GESTIÓN DE EMPRESAS AGROPECUARIAS',                                ambiente: 'Ambiente Y1',          lider: 'andreacollazos@gmail.com' },
    { codigo: '3225853', fechaInicio: '2025-07-25', fechaFin: '2027-10-24', finLectiva: '2027-04-24', area: 'TICS',         programa: 'ANALISIS Y DESARROLLO DE SOFTWARE.',                               ambiente: 'Ambiente Y14',         lider: 'diegosilva@gmail.com' },
    { codigo: '3225863', fechaInicio: '2025-07-25', fechaFin: '2026-10-24', finLectiva: '2026-04-24', area: 'TURISMO',      programa: 'COCINA.',                                                          ambiente: 'Ambiente Y18',         lider: 'anacamacho@gmail.com' },
    { codigo: '3279066', fechaInicio: '2025-07-25', fechaFin: '2026-10-24', finLectiva: '2026-04-24', area: 'CONSTRUCCION', programa: 'CONSTRUCCION DE EDIFICACIONES',                                    ambiente: 'Ambiente SAN AGUSTÍN', lider: 'juansuarez@gmail.com' },
    { codigo: '3311531', fechaInicio: '2025-10-09', fechaFin: '2027-01-08', finLectiva: '2026-07-08', area: 'CONSTRUCCION', programa: 'CATASTRO',                                                         ambiente: 'Ambiente NOCTURNO',    lider: 'santiagonoriega@gmail.com' },
    { codigo: '3312643', fechaInicio: '2025-10-09', fechaFin: '2028-01-08', finLectiva: '2027-07-08', area: 'CONSTRUCCION', programa: 'CONSTRUCCION DE INFRAESTRUCTURA VIAL',                             ambiente: 'Ambiente Y18',         lider: 'johnchavez@gmail.com' },
    { codigo: '3312662', fechaInicio: '2025-10-09', fechaFin: '2027-01-08', finLectiva: '2026-07-08', area: 'CONSTRUCCION', programa: 'INSTALACION DE SISTEMAS ELECTRICOS RESIDENCIALES Y COMERCIALES',  ambiente: 'Ambiente Y29' },
    { codigo: '3312744', fechaInicio: '2025-10-09', fechaFin: '2028-01-08', finLectiva: '2027-07-08', area: 'TICS',         programa: 'ANALISIS Y DESARROLLO DE SOFTWARE.',                               ambiente: 'Ambiente Y13',         lider: 'stevenbarrera@gmail.com' },
    { codigo: '3312887', fechaInicio: '2025-10-09', fechaFin: '2027-01-08', finLectiva: '2026-07-08', area: 'TURISMO',      programa: 'SERVICIOS DE BARISMO',                                             ambiente: 'Ambiente Y19',         lider: 'millerenciso@gmail.com' },
    { codigo: '3357199', fechaInicio: '2025-10-14', fechaFin: '2027-01-13', finLectiva: '2026-07-13', area: 'CONSTRUCCION', programa: 'CONSTRUCCION, MANTENIMIENTO Y REPARACION DE ESTRUCTURAS EN GUADUA', ambiente: 'Ambiente ACEVEDO' },
    { codigo: '3359805', fechaInicio: '2025-10-20', fechaFin: '2027-01-19', finLectiva: '2026-07-19', area: 'CONSTRUCCION', programa: 'CONSTRUCCION, MANTENIMIENTO Y REPARACION DE ESTRUCTURAS EN GUADUA', ambiente: 'Ambiente ISNOS' },
    { codigo: '3364810', fechaInicio: '2025-10-27', fechaFin: '2027-10-26', finLectiva: '2027-04-26', area: 'Agropecuario', programa: 'Producción Agropecuaria Ecológica',                                ambiente: 'Ambiente Y3',          lider: 'yonyparra@gmail.com' },
    { codigo: '3406552', fechaInicio: '2025-12-09', fechaFin: '2027-12-08', finLectiva: '2027-06-08', area: 'Agropecuario', programa: 'Producción Agropecuaria Ecológica',                                ambiente: 'Ambiente Y2',          lider: 'janierrincon@gmail.com' },
    { codigo: '3406572', fechaInicio: '2025-12-09', fechaFin: '2027-03-08', finLectiva: '2026-09-08', area: 'CONSTRUCCION', programa: 'CATASTRO',                                                         ambiente: 'Ambiente NOCTURNO',    lider: 'hermesmunoz@gmail.com' },
    { codigo: '3406595', fechaInicio: '2025-12-09', fechaFin: '2027-12-08', finLectiva: '2027-06-08', area: 'AMBIENTAL',    programa: 'GESTIÓN DE RECURSOS NATURALES',                                    ambiente: 'Ambiente Y26',         lider: 'javierjimenez@gmail.com' },
    { codigo: '3408221', fechaInicio: '2025-12-12', fechaFin: '2027-03-14', finLectiva: '2026-09-14', area: 'TURISMO',      programa: 'SERVICIOS DE BARISMO',                                             ambiente: 'Ambiente Y19',         lider: 'carloszuniga@gmail.com' },
    { codigo: '3408234', fechaInicio: '2025-12-12', fechaFin: '2027-03-14', finLectiva: '2026-09-14', area: 'TURISMO',      programa: 'SERVICIOS DE BARISMO',                                             ambiente: 'Ambiente Y19',         lider: 'diegolozano@gmail.com' },
    { codigo: '3410377', fechaInicio: '2026-03-10', fechaFin: '2028-06-13', finLectiva: '2027-12-13', area: 'AMBIENTAL',    programa: 'PREVENCION Y CONTROL AMBIENTAL',                                   ambiente: 'Ambiente Y27',         lider: 'edwarcalderon@gmail.com' },
    { codigo: '3410382', fechaInicio: '2026-03-10', fechaFin: '2028-06-13', finLectiva: '2027-12-13', area: 'Agropecuario', programa: 'GESTION AGROEMPRESARIAL',                                          ambiente: 'Ambiente Y1',          lider: 'johnberna@gmail.com' },
    { codigo: '3410385', fechaInicio: '2026-03-10', fechaFin: '2028-06-13', finLectiva: '2027-12-13', area: 'TICS',         programa: 'ANALISIS Y DESARROLLO DE SOFTWARE.',                               ambiente: 'Ambiente Y14',         lider: 'karolgutierrez@gmail.com' },
    { codigo: '3410406', fechaInicio: '2026-03-10', fechaFin: '2027-06-13', finLectiva: '2026-12-13', area: 'TURISMO',      programa: 'COCINA.',                                                          ambiente: 'Ambiente Y19',         lider: 'juliomanzano@gmail.com' },
    { codigo: '3410411', fechaInicio: '2026-03-10', fechaFin: '2027-03-13', finLectiva: '2026-09-13', area: 'Agropecuario', programa: 'PROMOTORIA CAMPESINA EN AGROECOLOGIA',                             ambiente: 'Ambiente Y7',          lider: 'nestorparra@gmail.com' },
    { codigo: '3410441', fechaInicio: '2026-03-10', fechaFin: '2026-12-13', finLectiva: '2026-06-13', area: 'Agropecuario', programa: 'MANEJO DE LA PRODUCCION PECUARIA',                                 ambiente: 'Ambiente Y7',          lider: 'camiloguzman@gmail.com' },
    { codigo: '3427094', fechaInicio: '2026-02-23', fechaFin: '2027-05-22', finLectiva: '2026-11-22', area: 'TURISMO',      programa: 'EJECUCION DE CLASES GRUPALES ORIENTADAS AL FITNESS',               ambiente: 'Ambiente Y19' },
    { codigo: '3427100', fechaInicio: '2026-02-23', fechaFin: '2027-05-22', finLectiva: '2026-11-22', area: 'TURISMO',      programa: 'EJECUCION DE CLASES GRUPALES ORIENTADAS AL FITNESS',               ambiente: 'Ambiente Y19' },
    { codigo: '3446525', fechaInicio: '2026-03-06', fechaFin: '2027-03-05', finLectiva: '2026-09-05', area: 'Agropecuario', programa: 'PRODUCCIÓN DE CAFÉS ESPECIALES',                                   ambiente: 'Ambiente Y8',          lider: 'nixonmunoz@gmail.com' },
    { codigo: '3451723', fechaInicio: '2026-03-09', fechaFin: '2026-09-08', finLectiva: '2026-06-08', area: 'Agropecuario', programa: 'LABORES DE CAMPO EN CULTIVOS',                                     ambiente: 'Ambiente Y7',          lider: 'yeisoncabezas@gmail.com' },
    { codigo: '3452166', fechaInicio: '2026-03-10', fechaFin: '2027-03-09', finLectiva: '2026-09-09', area: 'Agropecuario', programa: 'PRODUCCIÓN DE CAFÉS ESPECIALES',                                   ambiente: 'Ambiente Y8',          lider: 'joseoviedo@gmail.com' },
    { codigo: '3452168', fechaInicio: '2026-03-10', fechaFin: '2027-06-09', finLectiva: '2026-12-09', area: 'Agropecuario', programa: 'PRODUCCION PECUARIA.',                                             ambiente: 'Ambiente Y7',          lider: 'oscarvasquez@gmail.com' },
    { codigo: '3452183', fechaInicio: '2026-03-18', fechaFin: '2027-06-17', finLectiva: '2026-12-17', area: 'Agropecuario', programa: 'TECNICO EN OPERACIONES FORESTALES.',                               ambiente: 'Ambiente Y7',          lider: 'leidyvargas@gmail.com' },
    { codigo: '3454023', fechaInicio: '2026-03-11', fechaFin: '2027-06-10', finLectiva: '2026-12-10', area: 'Agropecuario', programa: 'PRODUCCION PECUARIA.',                                             ambiente: 'Ambiente Y7',          lider: 'jaimemurcia@gmail.com' },
    { codigo: '3454079', fechaInicio: '2026-03-11', fechaFin: '2027-06-10', finLectiva: '2026-12-10', area: 'Agropecuario', programa: 'PRODUCCION PECUARIA.',                                             ambiente: 'Ambiente Y7',          lider: 'paolalopez@gmail.com' },
    { codigo: '3454083', fechaInicio: '2026-03-16', fechaFin: '2027-03-15', finLectiva: '2026-09-15', area: 'CONSTRUCCION', programa: 'DIBUJO ARQUITECTÓNICO',                                            ambiente: 'Ambiente Y25',         lider: 'yesiddaza@gmail.com' },
  ];

  const fichas: Record<string, Curso> = {};
  for (const f of fichasData) {
    let curso = await cursoRepo.findOne({ where: { codigo: f.codigo } as any });
    if (!curso) {
      const areaEntity     = areas[f.area];
      const progEntity     = programas[f.programa];
      const liderEntity    = f.lider ? personas[f.lider] : undefined;
      const ambienteEntity = ambientes[f.ambiente];
      curso = cursoRepo.create({
        codigo: f.codigo,
        fechaInicio: f.fechaInicio as any,
        fechaFin: f.fechaFin as any,
        finLectiva: f.finLectiva as any,
        estado: 'activo' as any,
        area:      areaEntity     ? { idArea:     (areaEntity as any).idArea }         as any : undefined,
        programa:  progEntity     ? { idPrograma: (progEntity as any).id_programa ?? (progEntity as any).idPrograma } as any : undefined,
        lider:     liderEntity    ? { idPersona:  (liderEntity as any).idPersona }     as any : undefined,
        ambiente:  ambienteEntity ? { idAmbiente: (ambienteEntity as any).idAmbiente } as any : undefined,
      } as any);
      await cursoRepo.save(curso);
    }
    fichas[f.codigo] = curso;
  }
  console.log(`  ✓ Fichas (${fichasData.length})`);

  // ── Asignar fichaId a los aprendices y personas que la tienen en BD ───────
  const fichaIdMap: Record<string, string> = {
    'nilsonmurcia36@gmail.com': '3063290',
    'aprendiz@gmail.com':       '3063290',
    'martina@gmail.com':        '3454083',
    'carlosarcos@gmail.com':    '3063290',
  };
  for (const [correo, codigoFicha] of Object.entries(fichaIdMap)) {
    const persona = personas[correo];
    const ficha   = fichas[codigoFicha];
    if (persona && ficha && !(persona as any).fichaId) {
      (persona as any).fichaId = (ficha as any).idCurso;
      await personaRepo.save(persona);
    }
  }
  console.log('  ✓ fichaId asignado a aprendices');

  // ── Usuarios + Credenciales ─────────────────────────────────────────────
  const usuarioRepo = epsasDs.getRepository(Usuario);
  const credRepo    = epsasDs.getRepository(Credencial);

  const cargoRolMap: Record<string, string> = {
    administrador: 'administrador', instructor: 'instructor', aprendiz: 'aprendiz',
  };

  for (const p of personasData) {
    const persona = personas[p.correo];
    if (!persona) continue;

    const credExist = await credRepo.findOne({ where: { login: p.correo } as any });
    if (credExist) continue;

    const usuario = usuarioRepo.create({
      estado: 'activo',
      persona:    { idPersona:   (persona as any).idPersona } as any,
      aplicativo: { idAplicativo: appId }                      as any,
    } as any);
    await usuarioRepo.save(usuario);

    const rolNombre = cargoRolMap[p.cargo] ?? 'aprendiz';
    const rol = roles[rolNombre];
    const cred = credRepo.create({
      login:    p.correo,
      password: passwordHashMap[p.correo] ?? await hash('Sena2026!'),
      rol:      rol ? { idRol: (rol as any).idRol } as any : undefined,
      usuario:  { idUsuario: (usuario as any).idUsuario } as any,
    } as any);
    await credRepo.save(cred);
  }
  console.log(`  ✓ Usuarios y credenciales (${personasData.length})`);

  // ── Matrículas ──────────────────────────────────────────────────────────
  const matriculaRepo = epsasDs.getRepository(Matricula);
  const matriculasData = [
    { correo: 'nilsonmurcia36@gmail.com', ficha: '3063290' },
    { correo: 'aprendiz@gmail.com',       ficha: '3063290' },
    { correo: 'martina@gmail.com',        ficha: '3454083' },
  ];
  for (const { correo, ficha: codigoFicha } of matriculasData) {
    const persona = personas[correo];
    const ficha   = fichas[codigoFicha];
    if (!persona || !ficha) continue;
    const matExist = await matriculaRepo.findOne({
      where: {
        idPersona: (persona as any).idPersona,
        idCurso:   (ficha as any).idCurso,
      } as any,
    });
    if (!matExist) {
      const mat = matriculaRepo.create({
        persona: { idPersona: (persona as any).idPersona } as any,
        curso:   { idCurso:   (ficha as any).idCurso }     as any,
        estado: 'activo' as any,
        fechaMatricula: '2026-01-01',
      } as any);
      await matriculaRepo.save(mat);
    }
  }
  console.log('  ✓ Matrículas (aprendices asignados a fichas)');

  return { personas, fichas, ambientes, appId };
}

// ────────────────────────────────────────────────────────────────────────────

async function seedHorarios(
  horariosDs: DataSource,
  context: { personas: Record<string, Persona>; fichas: Record<string, Curso>; ambientes: Record<string, Ambiente> },
) {
  console.log('\n[3/3] Seeding horarios_db...');

  const horarioRepo = horariosDs.getRepository(Horario);
  const asigRepo    = horariosDs.getRepository(AsignacionHorario);
  const compRepo    = horariosDs.getRepository(Competencia);

  const { personas, fichas, ambientes } = context;
  const instructor = personas['nicolasmeneses@gmail.com'];  // Líder ficha 3063290
  const fichaAdso  = fichas['3063290'];
  const ambY15     = ambientes['Ambiente Y15'];

  if (!instructor || !fichaAdso || !ambY15) {
    console.log('  ! Datos de referencia no encontrados — horario omitido');
    return;
  }

  const instructorId = (instructor as any).idPersona;
  const fichaId      = (fichaAdso as any).idCurso;
  const ambienteId   = (ambY15 as any).idAmbiente;

  let horario = await horarioRepo.findOne({
    where: { diaSemana: 'miercoles', jornada: 'manana', horaInicio: '07:00:00' } as any,
  });
  if (!horario) {
    horario = horarioRepo.create({
      diaSemana: 'miercoles', jornada: 'manana',
      horaInicio: '07:00:00', horaFin: '12:00:00',
    } as any);
    await horarioRepo.save(horario);
  }
  const horarioId = (horario as any).id;

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
  console.log('  ✓ Horario: Miércoles mañana 07:00-12:00 (ADSO 3063290 / Nicolás / Y15)');

  const compExist = await compRepo.findOne({
    where: { asignacionId: asigId, nombre: 'Automatizacion IA' } as any,
  });
  if (!compExist) {
    const comp = compRepo.create({
      asignacion: { id: asigId } as any,
      instructorId, fichaId,
      nombre: 'Automatizacion IA',
      resultados: ['Chat bot en whatsApp'],
      fechaInicio: '2026-04-06',
      fechaFin:    '2026-05-27',
      diasClase: ['2026-04-06','2026-04-13','2026-04-20','2026-04-27','2026-05-06','2026-05-20','2026-05-27'],
    } as any);
    await compRepo.save(comp);
  }
  console.log('  ✓ Competencia de ejemplo: Automatizacion IA');
}

// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('ChronoGest — Seed completo (estado real del sistema)');
  console.log('='.repeat(60));
  console.log(`Host: ${PG_HOST}:${PG_PORT}`);
  console.log('  Personas: 78 | Ambientes: 26 | Programas: 24 | Fichas: 44');

  const masterDs = ds('chronogest_master_db', [CentroTenant, RootUser]);
  await masterDs.initialize();
  await seedMaster(masterDs);
  await masterDs.destroy();

  const epsasDs = ds('epsas_db', [
    Aplicativo, Rol, Modulo, Departamento, Municipio, CentroFormacion,
    Sede, Area, Programa, Ambiente, Persona, Usuario, Credencial, Curso, Matricula,
  ]);
  await epsasDs.initialize();
  const context = await seedEpsas(epsasDs);
  await epsasDs.destroy();

  const horariosDs = ds('horarios_db', [Horario, AsignacionHorario, Competencia]);
  await horariosDs.initialize();
  await seedHorarios(horariosDs, context);
  await horariosDs.destroy();

  console.log('\n' + '='.repeat(60));
  console.log('Seed completado exitosamente.');
  console.log('─'.repeat(60));
  console.log('SUPER ADMIN   admin@chronogest.com  / Admin1234!');
  console.log('─'.repeat(60));
  console.log('ADMIN         admin@gmail.com       / (hash real del sistema)');
  console.log('ADMIN         admin2@gmail.com      / (hash real del sistema)');
  console.log('─'.repeat(60));
  console.log('Instructores líderes:');
  console.log('  diegosilva@gmail.com    → área TICS');
  console.log('  carlosarcos@gmail.com   → área Agropecuario (transversal)');
  console.log('  elvisaraujo@gmail.com   → área TURISMO (transversal)');
  console.log('─'.repeat(60));
  console.log('Aprendices:');
  console.log('  nilsonmurcia36@gmail.com → ficha 3063290');
  console.log('  aprendiz@gmail.com       → ficha 3063290');
  console.log('  martina@gmail.com        → ficha 3454083');
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('\n[ERROR]', err.message ?? err);
  process.exit(1);
});
