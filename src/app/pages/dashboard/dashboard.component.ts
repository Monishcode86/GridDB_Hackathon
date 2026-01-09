import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/dataService';
import { NgxEchartsDirective } from 'ngx-echarts';


@Component({
  selector: 'app-dashboard',
  imports: [FormsModule,CommonModule,NgxEchartsDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  providers: []
})
export class DashboardComponent implements OnInit {
option:any
  constructor(private dataService: DataService) {
  }
  data:any=[]
  ngOnInit() {
   this.getchart()
    this.getData()
  }

  getData() {
    this.dataService.get('dummyjson.com/products').subscribe({
      next: (res:any) =>{
      console.log(res,"rrrrrr") 
      this.data = res['products'];
      },
      error: (error) => console.log(error,"eeeeee"),
      complete: () => console.log('Request completed')
    })
  }

  getchart(){
    this.option = {
  xAxis: {
    type: 'category',
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  },
  yAxis: {
    type: 'value'
  },
  series: [
    {
      data: [150, 230, 224, 218, 135, 147, 260],
      type: 'line'
    }
  ]
};


  }


}
