import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { RootAuthService } from '../../core/services/root-auth.service';

@Component({
  selector: 'app-root-layout',
  imports: [RouterOutlet, LucideAngularModule],
  template: `
    <div class="root-layout">
      <aside class="sidebar">
        <div class="sidebar-top">
          <div class="sidebar-logo">
            <lucide-icon name="shield" [size]="22" class="sidebar-logo-icon"></lucide-icon>
            <span class="sidebar-logo-text">ChronoGest</span>
          </div>
          <span class="sidebar-tag">Super Admin</span>
        </div>
        <nav class="sidebar-nav">
          <span class="nav-item active">
            <lucide-icon name="building" [size]="20" class="nav-icon"></lucide-icon>
            <span class="nav-label">Centros de Formación</span>
          </span>
        </nav>
        <button class="logout-btn" (click)="rootAuth.logout()">
          <lucide-icon name="log-out" [size]="18"></lucide-icon>
          Cerrar sesión
        </button>
      </aside>

      <div class="root-main">
        <header class="root-header">
          <div class="header-left">
            <span class="header-title">Administración Global de Tenants</span>
            <span class="header-sub">{{ rootAuth.rootEmail() }}</span>
          </div>
        </header>
        <main class="root-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .root-layout { display: flex; min-height: 100vh; background: var(--bg); }

    .sidebar {
      width: var(--sidebar-w); min-width: var(--sidebar-w);
      background: var(--navy); display: flex; flex-direction: column;
      position: fixed; left: 0; top: 0; bottom: 0; z-index: 50;
    }
    .sidebar-top { padding: 20px 16px; border-bottom: 1px solid rgba(255,255,255,.1); }
    .sidebar-logo { display: flex; align-items: center; gap: 10px; }
    .sidebar-logo-icon { color: #fff; flex-shrink: 0; }
    .sidebar-logo-text { color: #fff; font-weight: 800; font-size: 16px; }
    .sidebar-tag {
      display: inline-block; margin-top: 8px; background: rgba(255,255,255,.15);
      color: #fff; font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .05em; padding: 3px 8px; border-radius: 20px;
    }
    .sidebar-nav { flex: 1; padding: 16px 8px; display: flex; flex-direction: column; gap: 4px; }
    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 8px; color: rgba(255,255,255,.7);
      font-size: 14px; font-weight: 500;
    }
    .nav-item.active { background: rgba(255,255,255,.18); color: #fff; font-weight: 700; }
    .nav-icon { flex-shrink: 0; }
    .logout-btn {
      margin: 12px; padding: 10px 12px; border-radius: 8px;
      background: rgba(255,255,255,.08); color: rgba(255,255,255,.85);
      border: none; cursor: pointer; display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600; transition: background .15s;
    }
    .logout-btn:hover { background: rgba(255,255,255,.15); }

    .root-main { flex: 1; margin-left: var(--sidebar-w); display: flex; flex-direction: column; }
    .root-header {
      height: var(--header-h); background: var(--surface); border-bottom: 1px solid var(--border);
      display: flex; align-items: center; padding: 0 24px;
      position: sticky; top: 0; z-index: 40; box-shadow: 0 1px 4px rgba(0,0,0,.06);
    }
    .header-left { display: flex; flex-direction: column; gap: 1px; }
    .header-title { font-size: 14px; font-weight: 700; color: var(--text); }
    .header-sub { font-size: 11px; color: var(--text-muted); }
    .root-content { padding: 24px; flex: 1; }
  `],
})
export class RootLayoutComponent {
  constructor(public rootAuth: RootAuthService) {}
}
