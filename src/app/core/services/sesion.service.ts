import { Injectable } from '@angular/core';

/** Controla el límite de siete minutos en el navegador; no crea conexiones. */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private static readonly DURACION_MAXIMA_MS = 7 * 60 * 1000;
  private static readonly CLAVE_INICIO = 'wildecinemas.session.startedAt';
  private temporizador?: ReturnType<typeof setTimeout>;
  private cerrando = false;
  private obtenerUsuario: () => string | null = () => null;
  private cerrarAuth: () => Promise<void> = async () => {};

  /** AuthService entrega dos funciones: consultar el usuario y cerrar su sesión. */
  configurar(obtenerUsuario: () => string | null, cerrarAuth: () => Promise<void>): void {
    this.obtenerUsuario = obtenerUsuario;
    this.cerrarAuth = cerrarAuth;
    // Al volver a la pestaña, comprobamos el tiempo aunque el navegador pausara el timer.
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) void this.verificar();
      });
    }
  }

  /** Guarda el inicio de una sesión nueva sin reiniciar una marca existente. */
  iniciar(userId: string): void {
    const inicio = this.leerInicio(userId) ?? Date.now();
    this.guardarInicio(userId, inicio);
    this.programar(inicio);
  }

  /** Recupera el inicio y devuelve si la sesión sigue vigente.
   * Solo SIGNED_IN puede crear una marca faltante; renovar el token no reinicia el tiempo.
   */
  recuperar(userId: string, esInicioNuevo = false): boolean {
    let inicio = this.leerInicio(userId);
    if (esInicioNuevo && inicio === null) {
      inicio = Date.now();
      this.guardarInicio(userId, inicio);
    }
    if (inicio === null || this.vencida(inicio)) return false;
    this.programar(inicio);
    return true;
  }

  /** Consulta el usuario actual; si venció, pide a AuthService que cierre la sesión. */
  async verificar(): Promise<void> {
    const userId = this.obtenerUsuario();
    if (!userId || this.cerrando) return;
    const inicio = this.leerInicio(userId);
    if (inicio === null || this.vencida(inicio)) {
      await this.cerrar();
    } else {
      this.programar(inicio);
    }
  }

  /** Evita cierres simultáneos y limpia el reloj incluso si el cierre falla. */
  async cerrar(): Promise<void> {
    if (this.cerrando) return;
    this.cerrando = true;
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = undefined;
    try {
      await this.cerrarAuth();
    } finally {
      this.limpiar();
      this.cerrando = false;
    }
  }

  /** Cancela el temporizador y elimina la marca guardada en el navegador. */
  limpiar(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = undefined;
    try {
      localStorage.removeItem(SesionService.CLAVE_INICIO);
    } catch (error) {
      console.warn('No se pudo limpiar el inicio de la sesión:', error);
    }
  }

  /** Guarda el usuario y el instante de inicio para conservarlos al actualizar. */
  private guardarInicio(userId: string, inicio: number): void {
    try {
      localStorage.setItem(SesionService.CLAVE_INICIO, JSON.stringify({ userId, inicio }));
    } catch (error) {
      console.warn('No se pudo guardar el inicio de la sesión:', error);
    }
  }

  /** Devuelve una marca válida del mismo usuario, o null si falta o está dañada. */
  private leerInicio(userId: string): number | null {
    try {
      const raw = localStorage.getItem(SesionService.CLAVE_INICIO);
      if (!raw) return null;
      const dato = JSON.parse(raw) as { userId?: unknown; inicio?: unknown };
      if (dato.userId !== userId || typeof dato.inicio !== 'number' || !Number.isFinite(dato.inicio)) {
        return null;
      }
      return dato.inicio;
    } catch {
      return null;
    }
  }

  /** Compara el tiempo transcurrido con los siete minutos permitidos. */
  private vencida(inicio: number): boolean {
    return Date.now() - inicio >= SesionService.DURACION_MAXIMA_MS;
  }

  /** Programa una comprobación para cuando se cumpla el tiempo restante. */
  private programar(inicio: number): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    const restante = Math.max(0, inicio + SesionService.DURACION_MAXIMA_MS - Date.now());
    this.temporizador = setTimeout(() => void this.verificar(), restante);
  }
}
