import { Component, DoCheck, Input, OnChanges, Output, SimpleChanges, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-shift',
  imports: [FormsModule],
  templateUrl: './shift.component.html',
  styleUrl: './shift.component.scss'
})
export class ShiftComponent implements OnChanges, DoCheck, OnInit {

  @Input() mydata: any;

  @Output() sendChildData = new EventEmitter();



  childData: any = 'xyz'
  viewChildData="abc"
  constructor() {

    console.log('clicked', this.childData)
  }
  ngOnChanges(changes: SimpleChanges) {
    console.log("ngOnChanges:", changes['mydata']);
  }
  ngDoCheck() {
    console.log("Child Chanced", this.mydata)
  }

  ngOnInit() {
    this.sendData();
  }
  sendData() {
 
    this.sendChildData.emit(this.childData)
  }

  getviewchildData(){
    return this.childData
  }
}
