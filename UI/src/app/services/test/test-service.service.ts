import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TestServiceService {
  private hubConnection!: signalR.HubConnection;
  public deviceEvents = new BehaviorSubject<any[]>([]);
 
  constructor() {}
 
  public startConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://eventgridnotify.service.signalr.net/client/?hub=telemetry')
      .withAutomaticReconnect()
      .build();
 
    this.hubConnection
      .start()
      .then(() => console.log('Connected to SignalR hub'))
      .catch(err => console.error('SignalR connection error:', err));
 
    // Listen to events from Azure Function
    this.hubConnection.on('deviceStatus', (data: any) => {
      console.log('Received device event:', data);
 
      // Update observable
      const current = this.deviceEvents.value;
      this.deviceEvents.next([...current, data]);
    });
  }
 
  public stopConnection() {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}
