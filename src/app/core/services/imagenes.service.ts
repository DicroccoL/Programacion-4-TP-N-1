import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

/** Sube pósters al Storage; PeliculasService guarda su URL en la película. */
@Injectable({ providedIn: 'root' })
export class ImagenesService {
  private readonly auth = inject(AuthService);
  static readonly BUCKET = 'peliculas-imagenes';
  private readonly extensiones: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  };

  async subirPoster(archivo: File): Promise<string> {
    if (!this.auth.isAdmin()) throw new Error('Solo administración puede subir imágenes.');
    const extension = this.extensiones[archivo.type];
    if (!extension) throw new Error('Elegí una imagen JPG, PNG o WebP.');
    if (archivo.size === 0 || archivo.size > 5 * 1024 * 1024) {
      throw new Error('La imagen debe tener contenido y pesar como máximo 5 MB.');
    }
    const ruta = `peliculas/${crypto.randomUUID()}.${extension}`;
    const bucket = this.auth.client.storage.from(ImagenesService.BUCKET);
    const { error } = await bucket.upload(ruta, archivo, {
      contentType: archivo.type, cacheControl: '3600', upsert: false,
    });
    if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
    return bucket.getPublicUrl(ruta).data.publicUrl;
  }
}
