import {
  Component,
  OnInit,
} from '@angular/core';

import { DataService } from '../../services/dataService';
import * as echarts from 'echarts/core';
import {
  GridComponent,
  TooltipComponent,
  ToolboxComponent,
  DataZoomComponent,
} from 'echarts/components';
import { LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

import moment from 'moment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NgxEchartsDirective } from 'ngx-echarts';


echarts.use([
  GridComponent,
  TooltipComponent,
  ToolboxComponent,
  DataZoomComponent,
  LineChart,
  CanvasRenderer,
]);

@Component({
  selector: 'app-analytics',
  imports: [FormsModule, CommonModule, NgxEchartsDirective, MatIconModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent implements OnInit {
  lineOption: any;

  ngOnInit(): void {
    this.getData()
  }
  constructor(private dataService: DataService){}
  data:any;
  getData(){
    
    this.dataService.get(`/report?deviceId=34851867901C&fromDate=2025-01-01&toDate=2025-12-31`).subscribe({ 
      next: (res: any) => {
        console.log(res)
        this.buildLineChart(res)
      }

    })
  }

    buildLineChart(data: any) {
      const time = data?.timeStamps || [];
      const currentR = data?.energyArray || [];
 
  
      if (!time.length) {
        this.lineOption = {
          title: {
            text: 'No Data Available',
            left: 'center',
            top: 'middle',
          },
          xAxis: { show: false },
          yAxis: { show: false },
          series: [],
        };
        return;
      }
  
      this.lineOption = {
        title: {
          text: 'Current Trend (R / Y / B)',
        },
  
        tooltip: {
          trigger: 'axis',
        },
  
        toolbox: {
          feature: {
            restore: {},
            saveAsImage: {},
          },
        },
  
        dataZoom: [{ type: 'inside' }, { type: 'slider' }],
  
        grid: {
          top: 60,
          left: 60,
          right: 30,
          bottom: 60,
        },
  
        xAxis: {
          type: 'category',
          data: time,
          boundaryGap: false,
          axisLabel: {
            formatter: (value: string) => moment(value).utc().format('HH:mm'),
          },
        },
  
        yAxis: {
          type: 'value',
          name: 'Current (A)',
        },
  
        series: [
          {
            name: 'Current R',
            type: 'line',
            data: currentR,
            smooth: true,
            symbol: 'none',
            sampling: 'lttb',
          },
         
        ],
      };
    }

}
