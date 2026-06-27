import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RootAuthService {
  private readonly API = `${environment.apiUrl}/root/auth`;
  private readonly TOKEN_KEY = 'cg_root_token';
  private readonly EMAIL_KEY = 'cg_root_email';

  rootEmail = signal<string | null>(localStorage.getItem(this.EMAIL_KEY));

  constructor(private http: HttpClient, private router: Router) {}

  get token(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  get isAuthenticated(): boolean {
    return !!this.token;
  }

  login(email: string, password: string) {
    return this.http.post<{ access_token: string }>(`${this.API}/login`, { email, password }).pipe(
      tap((res) => {
        localStorage.setItem(this.TOKEN_KEY, res.access_token);
        localStorage.setItem(this.EMAIL_KEY, email);
        this.rootEmail.set(email);
      }),
    );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.EMAIL_KEY);
    this.rootEmail.set(null);
    this.router.navigate(['/landing']);
  }
}
