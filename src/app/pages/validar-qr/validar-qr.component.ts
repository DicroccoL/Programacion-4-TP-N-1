import { Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

interface QrDetector { detect(video: HTMLVideoElement): Promise<Array<{ rawValue: string }>>; }
type QrDetectorConstructor = new (options: { formats: string[] }) => QrDetector;

@Component({
  selector: 'app-validar-qr', standalone: true, imports: [FormsModule],
  template: `
    <main class="validar"><span>CONTROL DE ACCESO</span><h1>Validar entrada o Candy Bar</h1>
      <p>Escaneá el código o ingresalo manualmente. Cada código se acepta una sola vez por tipo de entrega.</p>
      <button type="button" (click)="escaneando() ? detenerEscaner() : iniciarEscaner()">{{ escaneando() ? 'Detener cámara' : 'Escanear QR con cámara' }}</button>
      <video #video [hidden]="!escaneando()" playsinline></video>
      <form (ngSubmit)="validar()"><label>Código QR<input name="codigo" [(ngModel)]="codigo" required autocomplete="off" autofocus></label>
        <label>Tipo<select name="tipo" [(ngModel)]="tipo"><option value="ENTRADAS">Entradas</option><option value="CANDY">Candy Bar</option></select></label>
        <button [disabled]="validando()">{{ validando() ? 'Validando…' : 'Validar código' }}</button>
      </form>
      @if (mensaje()) {<p class="ok" role="status">{{ mensaje() }}</p>}
      @if (error()) {<p class="error" role="alert">{{ error() }}</p>}
    </main>
  `,
  styles: [`
    .validar{max-width:700px;margin:3rem auto;padding:2rem;color:var(--text-primary);background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-lg)}.validar>span{font-size:.75rem;letter-spacing:.15em;color:var(--accent-crimson)}.validar>p{color:var(--text-secondary)}form{display:grid;gap:1rem;margin-top:1.5rem}label{display:grid;gap:.4rem;color:var(--text-secondary)}input,select{padding:.8rem;background:var(--bg-input);border:1px solid var(--border-strong);border-radius:var(--radius-sm);color:var(--text-primary)}button{justify-self:start;padding:.8rem 1rem;border:0;border-radius:var(--radius-sm);background:var(--accent-crimson);color:white;font-weight:700;cursor:pointer}video{display:block;width:min(100%,560px);margin-top:1rem;border-radius:var(--radius-md)}video[hidden]{display:none}.ok{color:#6ee7b7}.error{color:#fda4af}
  `],
})
/**
 * Valida entradas o productos de Candy Bar para personal autorizado.
 * La cámara sólo captura el texto; la validación y el uso único del código
 * se resuelven en Supabase mediante la RPC `validar_qr_orden`.
 */
export class ValidarQrComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  codigo = '';
  tipo: 'ENTRADAS' | 'CANDY' = 'ENTRADAS';
  readonly validando = signal(false);
  readonly mensaje = signal('');
  readonly error = signal('');
  readonly escaneando = signal(false);
  @ViewChild('video') private video?: ElementRef<HTMLVideoElement>;
  private stream?: MediaStream;
  private scanTimer?: ReturnType<typeof setInterval>;

  ngOnDestroy(): void { this.detenerEscaner(); }

  /** Abre la cámara y busca códigos QR cada medio segundo. */
  async iniciarEscaner(): Promise<void> {
    this.error.set('');
    const Constructor = (window as unknown as { BarcodeDetector?: QrDetectorConstructor }).BarcodeDetector;
    if (!Constructor) { this.error.set('Este navegador no ofrece lectura QR por cámara. Ingresá el código manualmente.'); return; }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      const element = this.video?.nativeElement;
      if (!element) throw new Error('No se pudo abrir la vista de cámara.');
      element.srcObject = this.stream;
      await element.play();
      this.escaneando.set(true);
      const detector = new Constructor({ formats: ['qr_code'] });
      this.scanTimer = setInterval(async () => {
        if (!element.videoWidth) return;
        try {
          const result = await detector.detect(element);
          if (result[0]?.rawValue) { this.codigo = result[0].rawValue; this.detenerEscaner(); await this.validar(); }
        } catch { /* Esperar el siguiente cuadro de cámara. */ }
      }, 500);
    } catch (e) { this.detenerEscaner(); this.error.set(e instanceof Error ? e.message : 'No se pudo acceder a la cámara. Ingresá el código manualmente.'); }
  }

  /** Detiene el intervalo de lectura y libera la cámara. */
  detenerEscaner(): void {
    if (this.scanTimer) clearInterval(this.scanTimer);
    this.scanTimer = undefined;
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
    this.escaneando.set(false);
  }

  /** Envía el código y el tipo de producto al servidor para validarlo. */
  async validar(): Promise<void> {
    this.validando.set(true); this.mensaje.set(''); this.error.set('');
    try {
      const { data, error } = await this.auth.client.rpc('validar_qr_orden', { p_codigo: this.codigo.trim(), p_tipo: this.tipo });
      if (error) throw error;
      this.mensaje.set(String(data)); this.codigo = '';
    } catch (e) { this.error.set(e instanceof Error ? e.message : 'No se pudo validar el código.'); }
    finally { this.validando.set(false); }
  }
}
