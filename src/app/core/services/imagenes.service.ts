import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

/** Sube pósters a Supabase Storage y devuelve su URL pública.
 * Se usa en FormularioPeliculaComponent al elegir una imagen desde la PC.
 * La URL se guarda en la película cuando se envía el formulario.
 */
@Injectable({ providedIn: 'root' })
export class ImagenesService {
  // Reutilizamos AuthService para consultar el rol y acceder al cliente Supabase.
  private readonly auth = inject(AuthService);
  // Nombre del contenedor de archivos configurado en Supabase Storage.
  static readonly BUCKET = 'peliculas-imagenes';
  // Relacionamos cada tipo MIME permitido con su extensión de archivo.
  private readonly extensiones: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  };

  /** Recibe un File, lo valida y lo sube. Devuelve una promesa con la URL.
   * Si falla una validación o la subida, lanza un error que muestra el formulario.
   */
  async subirPoster(archivo: File): Promise<string> {

    // Solo un administrador puede iniciar la subida desde la aplicación.
    if (!this.auth.isAdmin()) throw new Error('Solo administración puede subir imágenes.');

    // Aceptamos únicamente JPG, PNG y WebP según el tipo MIME del archivo.
    const extension = this.extensiones[archivo.type];
    if (!extension) throw new Error('Elegí una imagen JPG, PNG o WebP.');

    // Rechazamos archivos vacíos o mayores a 5 MB; size está expresado en bytes.
    if (archivo.size === 0 || archivo.size > 5 * 1024 * 1024) {
      throw new Error('La imagen debe tener contenido y pesar como máximo 5 MB.');
    }

    // Generamos un nombre único para evitar coincidencias con otros pósters.
    const ruta = `peliculas/${crypto.randomUUID()}.${extension}`;

    // Seleccionamos el bucket usando la conexión compartida de Supabase.
    const bucket = this.auth.client.storage.from(ImagenesService.BUCKET);
    
    // Subimos el archivo: indicamos su tipo, caché de una hora y sin sobrescribir.
    const { error } = await bucket.upload(ruta, archivo, {
      contentType: archivo.type, cacheControl: '3600', upsert: false,
    });
    // Si Storage informa un error, lo enviamos al componente mediante throw.
    if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
    // Construimos la URL pública del archivo ya subido y la devolvemos al formulario.
    return bucket.getPublicUrl(ruta).data.publicUrl;
  }
}
