import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CredencialesLogin } from '../../../models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  readonly isLoading = input<boolean>(false);
  readonly loginSubmit = output<CredencialesLogin>();

  email = '';
  password = '';

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.email || !this.password) {
      return;
    }
    this.loginSubmit.emit({
      email: this.email,
      password: this.password,
    });
  }
}
