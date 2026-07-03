import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { SearchableSelectComponent, SSOption } from '../../../shared/components/searchable-select.component';

interface RoleModule { icon: string; nombre: string; desc: string; }
interface RoleData { desc: string; icono: string; color: string; modulos: RoleModule[]; capacidades: string[]; }

const ROLES_INFO: Record<string, RoleData> = {
  aprendiz: {
    desc: 'Acceso de solo lectura a su información académica personal y seguimiento de su proceso formativo.',
    icono: 'graduation-cap',
    color: '#2563eb',
    modulos: [
      { icon: 'layout-dashboard', nombre: 'Dashboard', desc: 'Resumen de su actividad académica personal' },
      { icon: 'calendar', nombre: 'Mis Horarios', desc: 'Horario semanal organizado por competencias' },
    ],
    capacidades: [
      'Ver su horario semanal en tiempo real',
      'Consultar las competencias asignadas a su ficha',
      'Revisar el estado de avance de cada competencia',
      'Consultar la información y programa de su ficha formativa',
    ],
  },
  instructor: {
    desc: 'Gestión de horarios asignados, competencias académicas y manejo de solicitudes del centro.',
    icono: 'book-open',
    color: '#059669',
    modulos: [
      { icon: 'layout-dashboard', nombre: 'Dashboard', desc: 'Métricas y resumen de su actividad docente' },
      { icon: 'calendar', nombre: 'Mis Horarios', desc: 'Horario asignado, fichas y competencias a cargo' },
      { icon: 'inbox', nombre: 'Solicitudes', desc: 'Gestión de solicitudes de cambio de horario (instructores líder)' },
    ],
    capacidades: [
      'Consultar y revisar su horario de clases asignado',
      'Ver el avance formativo de las fichas a su cargo',
      'Actualizar el estado y progreso de las competencias',
      'Enviar y gestionar solicitudes de cambio de horario (si es Instructor Líder de área)',
    ],
  },
  admin: {
    desc: 'Control total del sistema académico del Centro de Formación: horarios, usuarios y configuración.',
    icono: 'shield',
    color: '#dc2626',
    modulos: [
      { icon: 'layout-dashboard', nombre: 'Dashboard', desc: 'Estadísticas globales del centro' },
      { icon: 'calendar', nombre: 'Horarios', desc: 'Gestión de todos los horarios del centro' },
      { icon: 'book-open', nombre: 'Fichas Formativas', desc: 'Administración de fichas y competencias' },
      { icon: 'users', nombre: 'Usuarios', desc: 'Registro y administración de usuarios' },
      { icon: 'inbox', nombre: 'Solicitudes', desc: 'Gestión de solicitudes del centro' },
      { icon: 'settings', nombre: 'Configuración', desc: 'Ajustes y parámetros del sistema' },
    ],
    capacidades: [
      'Gestionar horarios de todos los instructores del centro',
      'Administrar fichas formativas, competencias y aprendices',
      'Registrar y gestionar cualquier usuario del sistema',
      'Configurar ambientes, jornadas y parámetros académicos',
      'Aprobar y gestionar solicitudes de cambio de horario',
      'Acceder a estadísticas e indicadores globales del centro',
    ],
  },
};

@Component({
  selector: 'app-register-usuario',
  imports: [FormsModule, LucideAngularModule, SearchableSelectComponent],
  template: `
    <!-- TOP BAR -->
    <div class="reg-topbar">
      <button class="back-btn" (click)="volverAUsuarios()">
        <lucide-icon name="arrow-left" [size]="15"></lucide-icon>
        Volver a Usuarios
      </button>
      <div class="reg-title-block">
        <div class="reg-title-icon-wrap">
          <lucide-icon name="user-plus" [size]="20"></lucide-icon>
        </div>
        <div>
          <h2>Registrar Usuario</h2>
          <p>Completa los datos para crear una nueva cuenta en el sistema</p>
        </div>
      </div>
      <button class="btn btn-primary reg-submit-top" (click)="doRegister()" [disabled]="loading()">
        @if (loading()) { <span class="spinner-sm"></span> } @else {
          <lucide-icon name="user-check" [size]="15"></lucide-icon>
        }
        Registrar Usuario
      </button>
    </div>

    <!-- MAIN GRID -->
    <div class="reg-layout">

      <!-- ═══ LEFT: FORM ═══ -->
      <div class="reg-form-col">

        <!-- 1. TIPO DE USUARIO -->
        <div class="card reg-section">
          <div class="section-header">
            <lucide-icon name="user-cog" [size]="15"></lucide-icon>
            <span>Tipo de Usuario</span>
          </div>
          <div class="role-selector">
            @for (r of roles; track r.key) {
              <div class="role-card" [class.selected]="regRol() === r.key" (click)="selectRol(r.key)">
                <div class="role-icon-wrap"
                     [style.background]="regRol() === r.key ? rolesInfo[r.key].color : 'var(--bg)'">
                  <lucide-icon [name]="r.icon" [size]="22"
                    [style.color]="regRol() === r.key ? '#fff' : 'var(--text-muted)'"></lucide-icon>
                </div>
                <span class="role-label">{{ r.label }}</span>
                @if (regRol() === r.key) {
                  <lucide-icon name="check-circle" [size]="14" class="role-check"></lucide-icon>
                }
              </div>
            }
          </div>
        </div>

        <!-- 2. FICHA FORMATIVA (solo aprendiz — aparece aquí arriba para que el dropdown tenga espacio) -->
        @if (regRol() === 'aprendiz') {
          <div class="card reg-section">
            <div class="section-header">
              <lucide-icon name="graduation-cap" [size]="15"></lucide-icon>
              <span>Asignación de Ficha Formativa <span class="req">*</span></span>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Filtrar por área</label>
                <app-ss [options]="areaFiltroOpts()" placeholder="Todas las áreas"
                        [ngModel]="areaFiltroReg()" (ngModelChange)="areaFiltroReg.set($event)"></app-ss>
              </div>
              <div class="form-group">
                <label class="form-label">Ficha o Curso <span class="req">*</span></label>
                <app-ss [options]="fichasOpts()" placeholder="Buscar y seleccionar ficha..."
                        [(ngModel)]="regForm.fichaId"></app-ss>
              </div>
            </div>
          </div>
        }

        <!-- 3. INFORMACIÓN PERSONAL -->
        <div class="card reg-section">
          <div class="section-header">
            <lucide-icon name="user" [size]="15"></lucide-icon>
            <span>Información Personal</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Nombre <span class="req">*</span></label>
              <input class="form-control" [(ngModel)]="regForm.nombre" placeholder="Nombre(s)">
            </div>
            <div class="form-group">
              <label class="form-label">Apellido <span class="req">*</span></label>
              <input class="form-control" [(ngModel)]="regForm.apellido" placeholder="Apellido(s)">
            </div>
            <div class="form-group">
              <label class="form-label">Tipo de Documento <span class="req">*</span></label>
              <app-ss [options]="tipoDocOpts" placeholder="Seleccionar..." [(ngModel)]="regForm.tipoDoc"></app-ss>
            </div>
            <div class="form-group">
              <label class="form-label">Número de Documento <span class="req">*</span></label>
              <input class="form-control" [(ngModel)]="regForm.numDoc" placeholder="Número de documento">
            </div>
            <div class="form-group g-span-2">
              <label class="form-label">Correo Electrónico <span class="req">*</span></label>
              <div class="input-icon-wrap">
                <lucide-icon name="mail" [size]="14" class="input-icon"></lucide-icon>
                <input class="form-control with-icon" type="email"
                       [(ngModel)]="regForm.correo" placeholder="correo@ejemplo.com">
              </div>
            </div>
          </div>
        </div>

        <!-- 4. CREDENCIALES -->
        <div class="card reg-section">
          <div class="section-header">
            <lucide-icon name="lock" [size]="15"></lucide-icon>
            <span>Credenciales de Acceso</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Contraseña <span class="req">*</span></label>
              <div class="input-icon-wrap">
                <lucide-icon name="key" [size]="14" class="input-icon"></lucide-icon>
                <input class="form-control with-icon" [type]="showPass ? 'text' : 'password'"
                       [(ngModel)]="regForm.password" placeholder="Mínimo 6 caracteres">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Confirmar Contraseña <span class="req">*</span></label>
              <div class="input-icon-wrap">
                <lucide-icon name="key" [size]="14" class="input-icon"></lucide-icon>
                <input class="form-control with-icon" [type]="showPass ? 'text' : 'password'"
                       [(ngModel)]="confirmPass" placeholder="Repite la contraseña">
              </div>
            </div>
          </div>
          <label class="show-pass-toggle">
            <input type="checkbox" [(ngModel)]="showPass">
            <span>Mostrar contraseñas</span>
          </label>
        </div>

        <!-- 5. DATOS ADICIONALES -->
        <div class="card reg-section">
          <div class="section-header">
            <lucide-icon name="info" [size]="15"></lucide-icon>
            <span>Datos Adicionales</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <div class="input-icon-wrap">
                <lucide-icon name="phone" [size]="14" class="input-icon"></lucide-icon>
                <input class="form-control with-icon" [(ngModel)]="regForm.telefono" placeholder="Número de contacto">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Género</label>
              <app-ss [options]="generoOpts" placeholder="Seleccionar..." [(ngModel)]="regForm.genero"></app-ss>
            </div>
            <div class="form-group g-span-2">
              <label class="form-label">Municipio</label>
              <app-ss [options]="municipiosOpts()" placeholder="Seleccionar municipio..."
                      [(ngModel)]="regForm.municipio"></app-ss>
            </div>
          </div>
        </div>

        <!-- FEEDBACK -->
        @if (regError()) {
          <div class="feedback-msg error">
            <lucide-icon name="alert-circle" [size]="16"></lucide-icon>
            {{ regError() }}
          </div>
        }
        @if (regSuccess()) {
          <div class="feedback-msg success">
            <lucide-icon name="check-circle" [size]="16"></lucide-icon>
            {{ regSuccess() }}
          </div>
        }

        <!-- ACCIONES -->
        <div class="reg-actions">
          <button class="btn btn-outline" (click)="volverAUsuarios()">Cancelar</button>
          <button class="btn btn-primary" (click)="doRegister()" [disabled]="loading()">
            @if (loading()) { <span class="spinner-sm"></span> } @else {
              <lucide-icon name="user-check" [size]="15"></lucide-icon>
            }
            Registrar Usuario
          </button>
        </div>
      </div>

      <!-- ═══ RIGHT: ROLE INFO PANEL ═══ -->
      <div class="reg-info-col">
        <div class="role-info-panel">

          <div class="role-info-header" [style.background]="currentRoleInfo().color + '12'">
            <div class="role-info-icon-wrap" [style.background]="currentRoleInfo().color">
              <lucide-icon [name]="currentRoleInfo().icono" [size]="26" style="color:#fff"></lucide-icon>
            </div>
            <div>
              <div class="role-info-title">{{ currentRoleName() }}</div>
              <div class="role-info-desc">{{ currentRoleInfo().desc }}</div>
            </div>
          </div>

          <div class="role-info-section">
            <div class="role-info-label">
              <lucide-icon name="grid-2x2" [size]="12"></lucide-icon>
              Módulos con acceso
            </div>
            <div class="modules-list">
              @for (m of currentRoleInfo().modulos; track m.nombre) {
                <div class="module-item">
                  <div class="module-icon-sm" [style.background]="currentRoleInfo().color + '18'">
                    <lucide-icon [name]="m.icon" [size]="13" [style.color]="currentRoleInfo().color"></lucide-icon>
                  </div>
                  <div>
                    <div class="module-name">{{ m.nombre }}</div>
                    <div class="module-desc">{{ m.desc }}</div>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="role-info-section">
            <div class="role-info-label">
              <lucide-icon name="square-check" [size]="12"></lucide-icon>
              Puede realizar
            </div>
            <ul class="cap-list">
              @for (c of currentRoleInfo().capacidades; track c) {
                <li>
                  <lucide-icon name="check" [size]="12"
                    style="color:#16a34a;flex-shrink:0;margin-top:2px"></lucide-icon>
                  {{ c }}
                </li>
              }
            </ul>
          </div>

          <div class="info-tip">
            <lucide-icon name="info" [size]="13" style="flex-shrink:0;margin-top:1px"></lucide-icon>
            Las credenciales se generan aquí. El usuario podrá cambiar su contraseña desde el login una vez que inicie sesión.
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Top bar ─────────────────────────────────── */
    .reg-topbar {
      display: flex; align-items: center; gap: 16px;
      padding-bottom: 20px; margin-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    .back-btn {
      display: flex; align-items: center; gap: 6px;
      background: none; border: 1.5px solid var(--border); border-radius: 8px;
      padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
      color: var(--text-muted); white-space: nowrap; transition: all .15s;
    }
    .back-btn:hover { border-color: var(--navy); color: var(--navy); }
    .reg-title-block { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
    .reg-title-icon-wrap {
      width: 40px; height: 40px; border-radius: 10px;
      background: var(--navy); display: flex; align-items: center;
      justify-content: center; color: #fff; flex-shrink: 0;
    }
    .reg-title-block h2 { margin: 0; font-size: 1.2rem; white-space: nowrap; }
    .reg-title-block p  { margin: 0; font-size: 12px; color: var(--text-muted); }
    .reg-submit-top { white-space: nowrap; }

    /* ── Layout grid ─────────────────────────────── */
    .reg-layout {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 20px;
      align-items: start;
    }

    /* ── Form sections ───────────────────────────── */
    .reg-section { padding: 20px 24px; margin-bottom: 14px; }
    .section-header {
      display: flex; align-items: center; gap: 8px;
      font-size: 12.5px; font-weight: 700; color: var(--navy);
      margin-bottom: 16px; padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
      text-transform: uppercase; letter-spacing: .4px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .g-span-2 { grid-column: 1 / -1; }
    .req { color: #dc2626; }

    /* Input with leading icon */
    .input-icon-wrap { position: relative; }
    .input-icon {
      position: absolute; left: 11px; top: 50%;
      transform: translateY(-50%); color: var(--text-muted); pointer-events: none;
    }
    .with-icon { padding-left: 32px !important; }

    /* Show pass */
    .show-pass-toggle {
      display: inline-flex; align-items: center; gap: 7px;
      font-size: 12px; color: var(--text-muted);
      cursor: pointer; margin-top: 10px; user-select: none;
    }
    .show-pass-toggle input { cursor: pointer; }

    /* Role selector */
    .role-selector { display: flex; gap: 10px; }
    .role-card {
      flex: 1; border: 2px solid var(--border); border-radius: 12px;
      padding: 16px 10px; display: flex; flex-direction: column;
      align-items: center; gap: 8px; cursor: pointer; transition: all .18s;
      position: relative;
    }
    .role-card:hover { border-color: #93c5fd; }
    .role-card.selected { border-color: var(--navy); background: #eff6ff; }
    .role-icon-wrap {
      width: 44px; height: 44px; border-radius: 11px;
      display: flex; align-items: center; justify-content: center;
      transition: background .18s;
    }
    .role-label { font-size: 12px; font-weight: 700; color: var(--text); }
    .role-check { position: absolute; top: 8px; right: 8px; color: var(--navy); }

    /* Bottom actions */
    .reg-actions {
      display: flex; gap: 12px; justify-content: flex-end;
      padding-top: 20px;
    }

    /* Feedback */
    .feedback-msg {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 12px 16px; border-radius: 8px;
      font-size: 13px; font-weight: 600; margin-bottom: 12px;
    }
    .feedback-msg.error   { background: #fee2e2; color: #991b1b; }
    .feedback-msg.success { background: #dcfce7; color: #166534; }

    /* Spinner */
    .spinner-sm {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,.4);
      border-top-color: #fff; border-radius: 50%;
      animation: spin .6s linear infinite; display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Right info panel ────────────────────────── */
    .reg-info-col { position: sticky; top: 16px; }
    .role-info-panel {
      background: #fff; border-radius: 16px;
      border: 1.5px solid var(--border); overflow: hidden;
    }
    .role-info-header {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 20px; border-bottom: 1px solid var(--border);
      transition: background .25s;
    }
    .role-info-icon-wrap {
      width: 50px; height: 50px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: background .25s;
    }
    .role-info-title { font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: 4px; }
    .role-info-desc { font-size: 12px; color: var(--text-muted); line-height: 1.5; }

    .role-info-section { padding: 16px 20px; border-bottom: 1px solid var(--border); }
    .role-info-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 10.5px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .5px; color: var(--text-muted); margin-bottom: 12px;
    }

    .modules-list { display: flex; flex-direction: column; gap: 9px; }
    .module-item { display: flex; align-items: flex-start; gap: 10px; }
    .module-icon-sm {
      width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .module-name { font-size: 12px; font-weight: 700; color: var(--text); }
    .module-desc { font-size: 11px; color: var(--text-muted); margin-top: 1px; }

    .cap-list {
      list-style: none; padding: 0; margin: 0;
      display: flex; flex-direction: column; gap: 7px;
    }
    .cap-list li {
      display: flex; align-items: flex-start; gap: 7px;
      font-size: 12px; color: var(--text); line-height: 1.4;
    }

    .info-tip {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 14px 20px; background: #f8fafc;
      font-size: 11px; color: var(--text-muted); line-height: 1.5;
    }

    @media (max-width: 960px) {
      .reg-layout { grid-template-columns: 1fr; }
      .reg-info-col { position: static; }
      .reg-submit-top { display: none; }
      .reg-topbar { flex-wrap: wrap; }
    }
  `],
})
export class RegisterUsuarioComponent implements OnInit {
  // regRol como signal para que los computed() reaccionen al cambiar de rol
  regRol = signal('aprendiz');

  regForm: any = {
    tipoDoc: 'CC', genero: '', nombre: '', apellido: '',
    numDoc: '', correo: '', password: '', telefono: '', municipio: '', fichaId: '',
  };
  confirmPass = '';
  showPass = false;
  loading = signal(false);
  regError = signal('');
  regSuccess = signal('');
  fichas = signal<any[]>([]);
  areas = signal<string[]>([]);
  municipios = signal<any[]>([]);
  areaFiltroReg = signal('');

  readonly rolesInfo = ROLES_INFO;
  readonly roles = [
    { key: 'aprendiz',   icon: 'graduation-cap', label: 'Aprendiz' },
    { key: 'instructor', icon: 'book-open',       label: 'Instructor' },
    { key: 'admin',      icon: 'shield',          label: 'Administrador' },
  ];

  readonly tipoDocOpts: SSOption[] = [
    { value: 'CC', label: 'Cédula (CC)' },
    { value: 'TI', label: 'Tarjeta Identidad (TI)' },
    { value: 'CE', label: 'Cédula Extranjería (CE)' },
    { value: 'PA', label: 'Pasaporte (PA)' },
  ];

  readonly generoOpts: SSOption[] = [
    { value: '',  label: 'Seleccionar...' },
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Femenino' },
    { value: 'O', label: 'Otro' },
  ];

  municipiosOpts = computed<SSOption[]>(() => [
    { value: '', label: 'Seleccionar municipio...' },
    ...this.municipios().map(m => ({
      value: m.id ?? m.idMunicipio,
      label: `${m.nombre}${m.departamento_nombre ? ' (' + m.departamento_nombre + ')' : ''}`,
    })),
  ]);

  areaFiltroOpts = computed<SSOption[]>(() => [
    { value: '', label: 'Todas las áreas' },
    ...this.areas().map(a => ({ value: a, label: a })),
  ]);

  fichasOpts = computed<SSOption[]>(() => {
    let list = this.fichas();
    const area = this.areaFiltroReg();
    if (area) list = list.filter((f: any) => f.area === area);
    return [
      { value: '', label: 'Seleccionar ficha...' },
      ...list.map(f => ({ value: f.id, label: `${f.codigo} — ${f.programa}` })),
    ];
  });

  // Estos computed() reaccionan automáticamente porque regRol es un signal
  currentRoleInfo = computed(() => ROLES_INFO[this.regRol()] ?? ROLES_INFO['aprendiz']);
  currentRoleName = computed(() => this.roles.find(r => r.key === this.regRol())?.label ?? '');

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.api.getFichas().subscribe({
      next: (f) => {
        this.fichas.set(f ?? []);
        const unique = [...new Set((f ?? []).map((x: any) => x.area).filter(Boolean))].sort() as string[];
        this.areas.set(unique);
      },
      error: () => this.fichas.set([]),
    });
    this.api.getMunicipios().subscribe({
      next: (m) => this.municipios.set(m ?? []),
      error: () => this.municipios.set([]),
    });
  }

  selectRol(key: string) {
    this.regRol.set(key);
    if (key !== 'aprendiz') {
      this.regForm.fichaId = '';
      this.areaFiltroReg.set('');
    }
  }

  volverAUsuarios() {
    this.router.navigate(['/app/admin/usuarios']);
  }

  doRegister() {
    this.regError.set('');
    this.regSuccess.set('');
    const data = { ...this.regForm, rol: this.regRol() };

    if (!data.nombre || !data.apellido || !data.numDoc || !data.correo || !data.password) {
      this.regError.set('Completa todos los campos obligatorios'); return;
    }
    if (data.password !== this.confirmPass) {
      this.regError.set('Las contraseñas no coinciden'); return;
    }
    if (data.password.length < 6) {
      this.regError.set('La contraseña debe tener al menos 6 caracteres'); return;
    }
    if (this.regRol() === 'aprendiz' && !data.fichaId) {
      this.regError.set('Selecciona la Ficha o Curso del aprendiz'); return;
    }

    this.loading.set(true);
    this.auth.register(data).subscribe({
      next: () => {
        this.loading.set(false);
        this.regSuccess.set('Usuario registrado exitosamente. Puedes registrar otro o volver al listado.');
        this.resetForm();
        setTimeout(() => this.regSuccess.set(''), 6000);
      },
      error: (e) => {
        this.loading.set(false);
        this.regError.set(e?.error?.message ?? 'Error al registrar el usuario');
      },
    });
  }

  private resetForm() {
    this.regRol.set('aprendiz');
    this.confirmPass = '';
    this.areaFiltroReg.set('');
    this.regForm = {
      tipoDoc: 'CC', genero: '', nombre: '', apellido: '',
      numDoc: '', correo: '', password: '', telefono: '', municipio: '', fichaId: '',
    };
  }
}
