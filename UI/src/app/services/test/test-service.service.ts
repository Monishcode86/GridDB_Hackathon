import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
 
@Injectable({
  providedIn: 'root'
})
export class SignalRService {
 
  private hubConnection!: signalR.HubConnection;
 
  public deviceStatus$ = new BehaviorSubject<any>(null);
 
  async connect() {
    const negotiateResponse = await fetch(
      'https://gridstatus.azurewebsites.net/api/Negotiate'
    );
 
    const negotiate = await negotiateResponse.json();
 
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(negotiate.url, {
        accessTokenFactory: () => negotiate.accessToken
      })
      .withAutomaticReconnect()
      .build();
 
    this.hubConnection.on('deviceStatus', (data) => {
      this.deviceStatus$.next(data);
    });
 
    await this.hubConnection.start();
  }
 
  disconnect() {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}