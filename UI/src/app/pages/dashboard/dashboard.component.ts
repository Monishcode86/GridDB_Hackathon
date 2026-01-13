import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/dataService';
import { NgxEchartsDirective } from 'ngx-echarts';
import moment from 'moment-timezone';

import * as echarts from 'echarts/core';
import {
  GridComponent,
  TooltipComponent,
  ToolboxComponent,
  DataZoomComponent
} from 'echarts/components';
import { CustomChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { MatIconModule } from '@angular/material/icon';

echarts.use([
  GridComponent,
  TooltipComponent,
  ToolboxComponent,
  DataZoomComponent,
  CustomChart,
  CanvasRenderer
]);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, CommonModule, NgxEchartsDirective, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {

  machines = ['Machine 1', 'Machine 2', 'Machine 3'];
  selectedMachine = 'Machine 1';
  selectedDate: string = new Date().toISOString().split('T')[0];
  machineStatus = 'Running';
  lastUpdatedTime: string = new Date().toLocaleTimeString();
  option: any;
  gaugeOption: any;
  progressOption: any;
  lineOption: any;
  data: any[] = [];

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.getGauge();
    this.getProgress();
    this.getLineChart();
    this.getData();
  }
  changeDate(days: number) {
    const current = new Date(this.selectedDate);
    current.setDate(current.getDate() + days);
    this.selectedDate = current.toISOString().split('T')[0];
    this.lastUpdatedTime = new Date().toLocaleTimeString();
  }
  getData() {
    this.dataService.get('dummyjson.com/products').subscribe({
      next: (res: any) => {
        this.data = res.products;
      },
      error: (error) => console.error(error)
    });
  }

  getGauge() {
    this.gaugeOption = {
      series: [{
        type: "gauge",
        startAngle: 225,
        endAngle: -45,
        min: 0,
        max: 100,
        radius: "90%",
        splitNumber: 5,
        axisLine: {
          lineStyle: {
            width: 25,
            color: [
              [0.5, "#FF6B6B"],
              [0.8, "#FFD93D"],
              [1, "#6BCB77"],
            ],
          },
        },
        pointer: {
          show: true,
          length: "70%",
          width: 4,
        },
        detail: {
          valueAnimation: true,
          formatter: "{value}%",
          color: "black",
          fontSize: 16,
          fontWeight: "bold",
          offsetCenter: [0, "80%"],
        },

        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        title: {
          show: false,
        },
        data: [{ value: 82 }]
      }]
    };
  }

  getProgress() {
    this.progressOption = {
      series: [{
        type: "gauge",
        startAngle: 225,
        endAngle: -45,
        min: 0,
        max: 100,
        radius: "90%",
        splitNumber: 5,
        pointer: {
          show: true,
          length: "70%",
          width: 4,
        },
        detail: {
          valueAnimation: true,
          formatter: "{value}kWh",
          color: "black",
          fontSize: 16,
          fontWeight: "bold",
          offsetCenter: [0, "80%"],
        },

        axisTick: {
          show: false,
        },
        splitLine: {
          show: true,
          distance: -10
        },
        axisLabel: {
          show: true,
          distance: -16,
        },
        title: {
          show: false,
        },
        data: [{ value: 45 }]
      }]
    };
  }

  getLineChart() {
    const data = [
      {
        name: 'Off',
        fromTo: '06:00:00-06:15:00',
        value: [0, 1734049800000, 1734050700000, 900],
        itemStyle: { color: '#b0b0b0' }
      },
      {
        name: 'Idle',
        fromTo: '06:15:00-06:40:30',
        value: [0, 1734050700000, 1734052230000, 1530],
        itemStyle: { color: '#f7c030' }
      },
      {
        name: 'Running',
        fromTo: '06:40:30-07:25:10',
        value: [0, 1734052230000, 1734054910000, 2670],
        itemStyle: { color: '#548237' }
      },
      {
        name: 'Idle',
        fromTo: '07:25:10-07:35:00',
        value: [0, 1734054910000, 1734055500000, 590],
        itemStyle: { color: '#f7c030' }
      },
      {
        name: 'Running',
        fromTo: '07:35:00-08:45:20',
        value: [0, 1734055500000, 1734059720000, 4220],
        itemStyle: { color: '#548237' }
      },
      {
        name: 'Off',
        fromTo: '08:45:20-09:10:00',
        value: [0, 1734059720000, 1734061200000, 1480],
        itemStyle: { color: '#b0b0b0' }
      },
      {
        name: 'Running',
        fromTo: '09:10:00-10:05:45',
        value: [0, 1734061200000, 1734064545000, 3345],
        itemStyle: { color: '#548237' }
      },
      {
        name: 'Idle',
        fromTo: '10:05:45-10:30:00',
        value: [0, 1734064545000, 1734066000000, 1455],
        itemStyle: { color: '#f7c030' }
      },
      {
        name: 'Running',
        fromTo: '10:30:00-11:50:00',
        value: [0, 1734066000000, 1734071400000, 5400],
        itemStyle: { color: '#548237' }
      },
      {
        name: 'Off',
        fromTo: '11:50:00-12:30:00',
        value: [0, 1734071400000, 1734073800000, 2400],
        itemStyle: { color: '#b0b0b0' }
      }
    ];


    const startTime = data[0].value[1];
    const endTime = data[data.length - 1].value[2];

    const renderItem = (params: any, api: any) => {
      const start = api.coord([api.value(1), 0]);
      const end = api.coord([api.value(2), 0]);
      const height = api.size([0, 1])[1] * 0.6;

      const rect = echarts.graphic.clipRectByRect(
        {
          x: start[0],
          y: start[1] - height / 2,
          width: end[0] - start[0],
          height
        },
        params.coordSys
      );

      return rect ? { type: 'rect', shape: rect, style: api.style() } : null;
    };

    this.lineOption = {
      toolbox: {
        show: true,
        feature: {
          dataZoom: {
            yAxisIndex: 'none'
          },
          restore: {},
        }
      },
      title: {
        text: 'Gantt View'
      },
      tooltip: {
        formatter: (p: any) => `
          <b>Status:</b> ${p.data.name}<br/>
          <b>From-To:</b> ${p.data.fromTo}<br/>
          <b>Duration:</b> ${p.data.value[3]} sec
        `
      },
      xAxis: {
        min: startTime,
        max: endTime,
        axisTick: {
          show: false
        },
        axisLine: {
          show: false
        },
        axisLabel: {
          formatter: (v: number) => moment(v).format('HH:mm:ss')
        }
      },
      grid: { right: 5, left: 20, top: 50, bottom: 0 },
      yAxis: {
        type: 'category',
        data: ['Machine 1'],
        show: false
      },
      dataZoom: [
        {
          type: 'inside',
          filterMode: "weakFilter",
          start: 0,
          end: 100
        }
      ],
      series: [{
        type: 'custom',
        renderItem,
        encode: { x: [1, 2], y: 0 },
        data
      }]
    };
  }

}
