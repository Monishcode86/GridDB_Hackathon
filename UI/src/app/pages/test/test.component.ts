import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { TestServiceService } from '../../services/test/test-service.service';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-test',
  imports: [CommonModule],
  templateUrl: './test.component.html',
  styleUrl: './test.component.scss'
})
export class TestComponent implements OnInit, OnDestroy {
  deviceEvents: any[] = [];
  private sub!: Subscription;

  constructor(private signalRService: TestServiceService) {}

  ngOnInit(): void {
    this.signalRService.startConnection();
    this.sub = this.signalRService.deviceEvents.subscribe((events:any) => {
      this.deviceEvents = events;
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.signalRService.stopConnection();
  }
}
