import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth';
import { AdminPeliculasComponent } from '../componente-admin-peliculas/admin-peliculas.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [AdminPeliculasComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent {
  readonly authService = inject(AuthService);
}
