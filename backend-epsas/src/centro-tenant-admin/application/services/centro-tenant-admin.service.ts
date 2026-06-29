import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CentroTenantRepository } from '../../infrastructure/persistence/centro-tenant.repository';
import { CentroTenant } from '../../infrastructure/entities/centro-tenant.entity';
import { CreateCentroTenantDto } from '../dtos/create-centro-tenant.dto';
import { UpdateCentroTenantDto } from '../dtos/update-centro-tenant.dto';
import { CentroFormacion } from '../../../centro_formacion/infrastructure/persistence/centro-formacion.entity';
import { EPSAS_ENTITIES } from '../../../database/centro-datasource.factory';

@Injectable()
export class CentroTenantAdminService {
  private readonly logger = new Logger(CentroTenantAdminService.name);

  constructor(private readonly centroTenantRepo: CentroTenantRepository) {}

  // Crear un Centro de Formación (tenant)
  async crear(dto: CreateCentroTenantDto): Promise<CentroTenant> {
    const existente = await this.centroTenantRepo.obtenerPorSlug(dto.slug);
    if (existente) {
      throw new ConflictException(`Ya existe un Centro de Formación con el slug "${dto.slug}"`);
    }
    const centroTenant = this.centroTenantRepo.crear(dto);
    const guardado = await this.centroTenantRepo.guardar(centroTenant);
    await this.sembrarCentroFormacion(dto);
    return guardado;
  }

  /**
   * Crea el primer registro de "Centro de Formación" (estructura académica)
   * en la propia epsas_db del tenant recien creado, para que la jerarquia
   * Centro -> Sede -> Ambiente tenga un punto de partida sin pasos manuales.
   * Conexion directa y aislada (no via CentroDataSourceFactory) para evitar
   * una dependencia circular entre ambos servicios; best-effort: si la base
   * de datos del tenant aun no existe o no esta migrada, no bloquea la
   * creacion del tenant, solo se registra el error.
   */
  private async sembrarCentroFormacion(dto: CreateCentroTenantDto): Promise<void> {
    const dataSource = new DataSource({
      type: 'postgres',
      host: dto.epsasDbHost ?? process.env.DB_HOST,
      port: dto.epsasDbPort ?? parseInt(process.env.DB_PORT ?? '5435', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: dto.epsasDbName,
      entities: EPSAS_ENTITIES,
    });

    try {
      await dataSource.initialize();
      const repo = dataSource.getRepository(CentroFormacion);
      const yaExiste = await repo.count();
      if (yaExiste === 0) {
        await repo.save(repo.create({ nombre: dto.nombre }));
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo sembrar el Centro de Formación inicial en epsas_db de "${dto.slug}": ${(error as Error).message}`,
      );
    } finally {
      if (dataSource.isInitialized) await dataSource.destroy();
    }
  }

  // Obtener todos los Centros de Formación
  async obtenerTodos(): Promise<CentroTenant[]> {
    return await this.centroTenantRepo.obtenerTodos();
  }

  // Obtener un Centro de Formación por UUID
  async obtenerPorId(id: string): Promise<CentroTenant> {
    const centroTenant = await this.centroTenantRepo.obtenerPorId(id);
    if (!centroTenant) {
      throw new NotFoundException(`Centro de Formación con ID ${id} no encontrado`);
    }
    return centroTenant;
  }

  // Obtener un Centro de Formación por slug (usado por CentroDataSourceFactory)
  async obtenerPorSlug(slug: string): Promise<CentroTenant> {
    const centroTenant = await this.centroTenantRepo.obtenerPorSlug(slug);
    if (!centroTenant) {
      throw new NotFoundException(`Centro de Formación con slug "${slug}" no encontrado`);
    }
    return centroTenant;
  }

  // Actualizar un Centro de Formación
  async actualizar(id: string, dto: UpdateCentroTenantDto): Promise<CentroTenant> {
    const centroTenant = await this.obtenerPorId(id);
    Object.assign(centroTenant, dto);
    return await this.centroTenantRepo.guardar(centroTenant);
  }

  // Eliminar (soft: cambia estado a 'inactivo')
  async eliminar(id: string): Promise<{ mensaje: string }> {
    const centroTenant = await this.obtenerPorId(id);
    centroTenant.estado = 'inactivo';
    await this.centroTenantRepo.guardar(centroTenant);
    return { mensaje: `Centro de Formación con ID ${id} marcado como inactivo` };
  }
}
