import { Component } from '@angular/core';
import { AppLayoutComponent } from './layout/app-layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AppLayoutComponent],
  templateUrl: './app.html',
})
export class App {}
