import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RootAuthService } from '../../core/services/root-auth.service';
import { TenantService } from '../../core/services/tenant.service';
import { LucideAngularModule } from 'lucide-angular';

type AuthView = 'login' | 'forgot' | 'verify-code' | 'reset-pass';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule, RouterLink,
    LucideAngularModule,
  ],
  template: `
    <div class="login-page">
      <!-- LEFT PANEL -->
      <div class="left-panel">
        <div class="lp-logo">
          <lucide-icon name="calendar" [size]="28" class="lp-logo-icon"></lucide-icon>
          <div>
            <div class="lp-logo-name">ChronoGest</div>
            <div class="lp-logo-sub">SENA — Gestión de Horarios</div>
          </div>
        </div>
        <img src="assets/logo-sena-blanco.png" alt="SENA" class="lp-sena"
             onerror="this.style.opacity='0'">
        <div class="lp-modules">
          @for (m of modules; track m.title) {
          <div class="lp-module-card">
            <lucide-icon [name]="m.icon" [size]="24" class="lp-module-icon"></lucide-icon>
            <span class="lp-module-name">{{ m.title }}</span>
          </div>
          }
        </div>
        <p class="lp-footer">Sistema de Gestión Académica</p>
      </div>
      <!-- RIGHT PANEL -->
      <div class="right-panel">
        <!-- ===== LOGIN ===== -->
        @if (view() === 'login') {
        <div class="form-box">
          <a routerLink="/landing" class="back-link">← Volver al inicio</a>
          @if (sessionExpired()) {
          <div class="session-expired-banner">
            <lucide-icon name="alert-circle" [size]="16"></lucide-icon>
            Tu sesión expiró (duración máxima: 12h). Por favor inicia sesión de nuevo.
          </div>
          }
          <h2>Bienvenido de vuelta</h2>
          <p class="rp-sub">Ingresa tus credenciales para acceder al sistema</p>

          <form (ngSubmit)="doLogin()" #loginForm="ngForm">
            <div class="form-group mt-4">
              <label class="form-label">Número de documento o correo</label>
              <input class="form-control" type="text" [(ngModel)]="identifier"
                     name="identifier" placeholder="tu_documento o correo@ejemplo.com" required>
            </div>
            <div class="form-group mt-4" style="position:relative">
              <label class="form-label">Contraseña</label>
              <input class="form-control" [type]="showPass ? 'text' : 'password'"
                     [(ngModel)]="password" name="password" placeholder="••••••••" required>
              <button type="button" class="toggle-pass" (click)="showPass = !showPass">
                @if (showPass) {
                  <lucide-icon name="eye-off" [size]="16"></lucide-icon>
                } @else {
                  <lucide-icon name="eye" [size]="16"></lucide-icon>
                }
              </button>
            </div>

            <button type="button" class="advanced-toggle" (click)="mostrarCentroAvanzado = !mostrarCentroAvanzado">
              <lucide-icon name="settings" [size]="12"></lucide-icon>
              {{ mostrarCentroAvanzado ? 'Ocultar opción avanzada' : '¿Problemas para entrar? Opción avanzada' }}
            </button>
            @if (mostrarCentroAvanzado) {
              <div class="form-group mt-3">
                <label class="form-label">Centro de Formación (opcional)</label>
                <input class="form-control" type="text" [ngModel]="centroSlug"
                       (ngModelChange)="onCentroSlugChange($event)"
                       name="centroSlug" placeholder="default" [ngModelOptions]="{standalone: true}">
                <span class="form-hint">Normalmente no necesitas llenar esto — el sistema detecta tu Centro de Formación automáticamente. Solo complétalo si tu administrador te lo pide específicamente.</span>
              </div>
            }

            @if (error()) {
            <div class="error-msg mt-3">{{ error() }}</div>
            }

            <button class="btn-submit mt-3" type="submit" [disabled]="loading()">
              @if (loading()) { <span class="spinner"></span> } @else {
                <lucide-icon name="lock" [size]="16"></lucide-icon>
              }
              Iniciar Sesión
            </button>
          </form>

          <div class="login-links">
            <button class="link-btn" (click)="view.set('forgot')">
              <lucide-icon name="key" [size]="12"></lucide-icon>
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>
        }

        <!-- ===== FORGOT PASSWORD ===== -->
        @if (view() === 'forgot') {
        <div class="form-box">
          <button class="back-link" (click)="view.set('login')">← Volver al login</button>
          <div class="modal-icon"><lucide-icon name="mail" [size]="40"></lucide-icon></div>
          <h2>Recuperar Contraseña</h2>
          <p class="rp-sub">Ingresa tu correo registrado para recibir el código de verificación</p>
          <div class="form-group mt-4">
            <label class="form-label">Correo electrónico</label>
            <input class="form-control" type="email" [(ngModel)]="resetEmail" placeholder="correo@ejemplo.com">
          </div>
          @if (error()) { <div class="error-msg">{{ error() }}</div> }
          <button class="btn-submit mt-4" (click)="doForgot()" [disabled]="loading()">
            Enviar código
          </button>
        </div>
        }

        <!-- ===== VERIFY CODE ===== -->
        @if (view() === 'verify-code') {
        <div class="form-box">
          <button class="back-link" (click)="view.set('forgot')">← Volver</button>
          <div class="modal-icon"><lucide-icon name="key" [size]="40"></lucide-icon></div>
          <h2>Código de Verificación</h2>
          <p class="rp-sub">Ingresa el código de 6 dígitos enviado a <strong>{{ resetEmail }}</strong></p>
          <div class="form-group mt-4">
            <label class="form-label">Código</label>
            <input class="form-control text-center" [(ngModel)]="resetCode"
                   placeholder="_ _ _ _ _ _" maxlength="6" style="letter-spacing:8px;font-size:20px">
          </div>
          @if (error()) { <div class="error-msg">{{ error() }}</div> }
          <button class="btn-submit mt-4" (click)="doVerifyCode()" [disabled]="loading()">
            Verificar Código
          </button>
        </div>
        }

        <!-- ===== RESET PASSWORD ===== -->
        @if (view() === 'reset-pass') {
        <div class="form-box">
          <div class="modal-icon"><lucide-icon name="lock" [size]="40"></lucide-icon></div>
          <h2>Nueva Contraseña</h2>
          <p class="rp-sub">Ingresa tu nueva contraseña</p>
          <div class="form-group mt-4">
            <label class="form-label">Nueva contraseña</label>
            <input class="form-control" type="password" [(ngModel)]="newPassword" placeholder="••••••••">
          </div>
          <div class="form-group mt-4">
            <label class="form-label">Confirmar contraseña</label>
            <input class="form-control" type="password" [(ngModel)]="confirmPassword" placeholder="••••••••">
          </div>
          @if (error()) { <div class="error-msg">{{ error() }}</div> }
          <button class="btn-submit mt-4" (click)="doResetPass()" [disabled]="loading()">
            Actualizar Contraseña
          </button>
        </div>
        }

      </div>

    </div>
  `,
  styles: [`
    .login-page { display: flex; min-height: 100vh; }

    /* Left panel */
    .left-panel {
      width: 420px; min-width: 320px; background: #1e3a5f;
      display: flex; flex-direction: column; align-items: center;
      padding: 48px 32px; gap: 24px;
    }
    .lp-logo { display: flex; align-items: center; gap: 12px; color: #fff; }
    .lp-logo-icon { color: #fff; }
    .lp-logo-name { font-size: 20px; font-weight: 800; }
    .lp-logo-sub { font-size: 11px; color: rgba(255,255,255,.6); }
    .lp-sena {
      width: 90px; height: 90px; object-fit: contain;
      filter: brightness(0) invert(1);
    }
    .lp-modules {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%;
    }
    .lp-module-card {
      background: rgba(255,255,255,.1); border-radius: 12px;
      padding: 16px; display: flex; flex-direction: column; align-items: center;
      gap: 8px; color: #fff; border: 1px solid rgba(255,255,255,.15);
    }
    .lp-module-icon { color: #fff; }
    .lp-module-name { font-size: 12px; font-weight: 600; text-align: center; }
    .lp-footer { color: rgba(255,255,255,.4); font-size: 11px; margin-top: auto; }

    /* Right panel */
    .right-panel {
      flex: 1; background: #fff; display: flex;
      align-items: center; justify-content: center; padding: 40px 24px;
      overflow-y: auto;
    }
    .form-box { width: 100%; max-width: 420px; }
    .back-link {
      display: inline-block; color: #6b7280; font-size: 13px;
      margin-bottom: 24px; cursor: pointer; text-decoration: none;
      background: none; border: none; padding: 0;
    }
    .back-link:hover { color: #1e3a5f; }
    .form-box h2 { font-size: 1.6rem; color: #111827; margin-bottom: 6px; }
    .rp-sub { color: #6b7280; font-size: 14px; margin-bottom: 8px; }
    .modal-icon {
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 12px; color: #1e3a5f;
    }
    .toggle-pass {
      position: absolute; right: 12px; top: 36px;
      background: none; border: none; cursor: pointer;
      color: #6b7280; display: flex; align-items: center;
    }
    .btn-submit {
      width: 100%; margin-top: 20px; padding: 13px;
      background: #1e3a5f; color: #fff; border: none;
      border-radius: 10px; font-size: 15px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: background .15s;
    }
    .btn-submit:hover { background: #2a4d7a; }
    .btn-submit:disabled { opacity: .6; cursor: not-allowed; }
    .btn-outline {
      flex: 1; padding: 13px; background: transparent; border: 1.5px solid #d1d5db;
      border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; color: #374151;
    }
    .btn-row { display: flex; gap: 12px; margin-top: 20px; }
    .login-links {
      display: flex; gap: 8px; align-items: center; justify-content: center;
      margin-top: 16px; font-size: 13px; color: #6b7280;
    }
    .link-btn {
      display: flex; align-items: center; gap: 5px;
      background: none; border: none; color: #2563eb; cursor: pointer;
      font-size: 13px; padding: 0;
    }
    .link-btn:hover { text-decoration: underline; }
    .advanced-toggle {
      display: flex; align-items: center; gap: 5px; background: none; border: none;
      color: #9ca3af; cursor: pointer; font-size: 11.5px; padding: 0; margin-top: 14px;
    }
    .advanced-toggle:hover { color: #6b7280; }
    .session-expired-banner {
      display: flex; align-items: center; gap: 8px;
      background: #fff7ed; color: #92400e; border: 1px solid #fcd34d;
      border-radius: 8px; padding: 10px 14px; font-size: 13px;
      font-weight: 600; margin-bottom: 4px;
    }
    .error-msg {
      background: #fee2e2; color: #991b1b; border-radius: 8px;
      padding: 10px 14px; font-size: 13px; margin-top: 12px;
    }
    .success-msg {
      background: #dcfce7; color: #166534; border-radius: 8px;
      padding: 10px 14px; font-size: 13px;
    }
    .spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.4);
      border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .text-center { text-align: center; }

    @media (max-width: 768px) {
      .left-panel { display: none; }
      .right-panel { background: #f3f4f6; }
    }
  `],
})
export class LoginComponent implements OnInit {
  view = signal<AuthView>('login');
  sessionExpired = signal(false);

  // Login
  identifier = '';
  password = '';
  showPass = false;
  loading = signal(false);
  error = signal('');
  mostrarCentroAvanzado = false;

  // Reset password
  resetEmail = '';
  resetCode = '';
  newPassword = '';
  confirmPassword = '';

  modules = [
    { icon: 'calendar', title: 'Horarios' },
    { icon: 'building-2', title: 'Ambientes' },
    { icon: 'graduation-cap', title: 'Instructores' },
    { icon: 'layout-dashboard', title: 'Fichas' },
  ];

  centroSlug = 'default';

  constructor(
    private auth: AuthService,
    private rootAuth: RootAuthService,
    private router: Router,
    private route: ActivatedRoute,
    public tenant: TenantService,
  ) {
    this.centroSlug = this.tenant.slug;
  }

  onCentroSlugChange(valor: string) {
    this.centroSlug = valor;
    this.tenant.setSlug(valor.trim() || 'default');
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      if (params.get('expired') === '1') {
        this.sessionExpired.set(true);
      }
    });
  }

  doLogin() {
    if (!this.identifier || !this.password) {
      this.error.set('Completa todos los campos'); return;
    }
    this.loading.set(true);
    this.error.set('');

    // Credenciales exclusivas de Super Admin (gestión de Centros de Formación) —
    // se intentan primero y en silencio; si no coinciden, sigue el login normal.
    if (this.identifier.includes('@')) {
      this.rootAuth.login(this.identifier, this.password).subscribe({
        next: () => { this.loading.set(false); this.router.navigate(['/root/centros']); },
        error: () => this.doNormalLogin(),
      });
    } else {
      this.doNormalLogin();
    }
  }

  private doNormalLogin() {
    this.loading.set(true);
    // Si el usuario abrió "opción avanzada" y escribió un Centro de
    // Formación específico, se respeta tal cual (login normal, que usa el
    // slug ya fijado por onCentroSlugChange). En el caso normal — la gran
    // mayoría de usuarios — se detecta el centro automáticamente por
    // credenciales, sin que tengan que saber qué es un "slug".
    const usarSlugManual = this.mostrarCentroAvanzado && this.centroSlug?.trim();
    const obs = usarSlugManual
      ? this.auth.login(this.identifier, this.password)
      : this.auth.loginAuto(this.identifier, this.password);

    obs.subscribe({
      next: (res) => {
        this.loading.set(false);
        const role = res.user.rol;
        if (role === 'admin') this.router.navigate(['/app/admin/dashboard']);
        else if (role === 'instructor') this.router.navigate(['/app/instructor/dashboard']);
        else this.router.navigate(['/app/aprendiz/dashboard']);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e?.error?.message ?? 'Credenciales inválidas');
      },
    });
  }

  doForgot() {
    if (!this.resetEmail) { this.error.set('Ingresa tu correo'); return; }
    this.loading.set(true);
    this.error.set('');
    this.auth.forgotPassword(this.resetEmail).subscribe({
      next: () => { this.loading.set(false); this.view.set('verify-code'); },
      error: (e) => { this.loading.set(false); this.error.set(e?.error?.message ?? 'Correo no encontrado'); },
    });
  }

  doVerifyCode() {
    if (!this.resetCode) { this.error.set('Ingresa el código'); return; }
    this.loading.set(true);
    this.error.set('');
    this.auth.verifyResetCode(this.resetEmail, this.resetCode).subscribe({
      next: () => { this.loading.set(false); this.view.set('reset-pass'); },
      error: () => { this.loading.set(false); this.error.set('Código inválido o expirado'); },
    });
  }

  doResetPass() {
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('Las contraseñas no coinciden'); return;
    }
    if (!this.newPassword) { this.error.set('Ingresa la nueva contraseña'); return; }
    this.loading.set(true);
    this.error.set('');
    this.auth.resetPassword(this.resetEmail, this.resetCode, this.newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.view.set('login');
        this.error.set('');
      },
      error: (e) => { this.loading.set(false); this.error.set(e?.error?.message ?? 'Error'); },
    });
  }
}
