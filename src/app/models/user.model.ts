export type RolUsuario = 'cliente' | 'empleado' | 'admin';
export type TipoSangre = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface PerfilUsuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  tipoSangre?: TipoSangre | string;
  colorOjos?: string;
  diasVacacionesAnio?: number;
  rol: RolUsuario;
  saldoCredito: number;
  puntosFidelidad: number;
  primeraCompraUsada: boolean;
}

export interface CredencialesLogin {
  email: string;
  password: string;
}

export interface CredencialesRegistro {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  tipoSangre: TipoSangre | string;
  colorOjos: string;
  diasVacacionesAnio: number;
}

