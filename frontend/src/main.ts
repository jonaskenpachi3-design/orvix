import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { NgbModule, NgbModalModule, NgbToastModule, NgbDatepickerModule, NgbDropdownModule, NgbTooltipModule, NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID, isDevMode } from '@angular/core';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/auth/auth.interceptor';
import { ThemeService } from './app/core/theme/theme.service';
import { provideServiceWorker } from '@angular/service-worker';

// Registrar locale pt-BR para pipes de moeda/data
registerLocaleData(localePt);

bootstrapApplication(AppComponent, {
  providers: [
    // Roteamento com binding de inputs nos componentes
    provideRouter(routes, withComponentInputBinding()),

    // HTTP com interceptors
    provideHttpClient(withInterceptors([authInterceptor])),

    // ng-bootstrap modules
    importProvidersFrom(
      NgbModule,
      NgbModalModule,
      NgbToastModule,
      NgbDatepickerModule,
      NgbDropdownModule,
      NgbTooltipModule,
      NgbPopoverModule
    ),

    // Locale pt-BR para CurrencyPipe, DatePipe
    { provide: LOCALE_ID, useValue: 'pt-BR' },

    // Theme service (inicializa o tema antes do app renderizar)
    ThemeService, provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          }),
  ],
}).catch((err) => console.error(err));