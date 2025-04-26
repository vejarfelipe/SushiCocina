import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { locationOutline, callOutline } from 'ionicons/icons';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot()
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor() {
    // Registrar los íconos que se utilizarán
    addIcons({
      'location-outline': locationOutline,
      'call-outline': callOutline
    });
  }
} 