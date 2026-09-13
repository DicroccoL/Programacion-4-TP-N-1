export type UserRole = 'cliente' | 'empleado' | 'admin';

export type TipoSangre = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface UserProfile {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  tipoSangre?: TipoSangre | string;
  colorOjos?: string;
  diasVacacionesAnio?: number;
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
  tipoSangre: TipoSangre | string;
  colorOjos: string;
  diasVacacionesAnio: number;
}

