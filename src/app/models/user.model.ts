export type UserRole = 'cliente' | 'empleado' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  rol: UserRole;
  saldoCredito: number;
  puntosFidelidad: number;
  primeraCompraUsada: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
}
