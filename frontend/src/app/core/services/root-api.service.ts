import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RootAuthService } from './root-auth.service';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/admin/centros-tenant`;

@Injectable({ providedIn: 'root' })
export class RootApiService {
  constructor(private http: HttpClient, private rootAuth: RootAuthService) {}

  private get headers() {
    return { Authorization: `Bearer ${this.rootAuth.token}` };
  }

  getCentros() {
    return this.http.get<any[]>(BASE, { headers: this.headers });
  }
  createCentro(d: any) {
    return this.http.post<any>(BASE, d, { headers: this.headers });
  }
  updateCentro(id: string, d: any) {
    return this.http.patch<any>(`${BASE}/${id}`, d, { headers: this.headers });
  }
  deleteCentro(id: string) {
    return this.http.delete<any>(`${BASE}/${id}`, { headers: this.headers });
  }
}
