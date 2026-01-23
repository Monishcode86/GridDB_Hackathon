import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/dataService';
import { NgxEchartsDirective } from 'ngx-echarts';
import moment from 'moment-timezone';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import * as echarts from 'echarts/core';
import {
  GridComponent,
  TooltipComponent,
  ToolboxComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CustomChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { MatIconModule } from '@angular/material/icon';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

echarts.use([
  GridComponent,
  TooltipComponent,
  ToolboxComponent,
  DataZoomComponent,
  CustomChart,
  CanvasRenderer,
]);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, CommonModule, NgxEchartsDirective, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  machines: any[] = [];
  @ViewChild('downloadtemplate') downloadtemplate!: TemplateRef<any>;
  selectedMachine: string = '';
  selectedDate: string = new Date().toISOString().split('T')[0];
  machineStatus: string = 'Off';
  lastUpdatedTime: string = new Date().toLocaleTimeString();
  option: any;
  gaugeOption: any;
  progressOption: any;
  lineOption: any;
  ganttOption: any;
  data: any = {};
  today: string = new Date().toISOString().split('T')[0];
  isCurrent: boolean = true;
  constructor(private modalService: NgbModal, private dataService: DataService) { }

  ngOnInit() {
    this.getDevice()
  }
  getDevice() {
    this.dataService.get(`/device`).subscribe({
      next: (res: any) => {
        this.machines = [{ deviceId: "GHC4HGV5", machineName: 'Machine 1' }, { deviceId: "G1HCHGV5", machineName: 'Machine 2' }, { deviceId: "GH55CHGV5", machineName: 'Machine 3' }]
        this.selectedMachine = this.machines[0]['deviceId']
        this.getData();
      },
      error: (error) => {
        console.error(error),
          this.machines = [{ deviceId: "GHC4HGV5", machineName: 'Machine 1' }, { deviceId: "G1HCHGV5", machineName: 'Machine 2' }, { deviceId: "GH55CHGV5", machineName: 'Machine 3' }]
        this.selectedMachine = this.machines[0]['deviceId']
        this.getData();

      }
    });
  }
  changeDevice(e: any) {
    this.getData()
  }
  changemmainDate(e: any) {
    this.isCurrent = false;
    this.getData()
  }
  changeDate(days: number) {
    const current = new Date(this.selectedDate);
    current.setDate(current.getDate() + days);
    if (current.toISOString().split('T')[0] >= this.today) {
      this.isCurrent = true;
    } else {
      this.isCurrent = false;
    }
    this.selectedDate = current.toISOString().split('T')[0];
    this.lastUpdatedTime = new Date().toLocaleTimeString();
    this.getData();
  }

  generateEnergyLineData(
    startValue = 100,
    durationMinutes = 5
  ) {
    const data: { time: string; value: number }[] = [];

    const intervalMs = 250;
    const totalPoints = (durationMinutes * 60 * 1000) / intervalMs;

    let currentValue = startValue;
    let currentTime = new Date();
    currentTime.setHours(0, 0, 0, 0);

    for (let i = 0; i < totalPoints; i++) {
      currentValue += (Math.random() - 0.5) * 2;

      data.push({
        time: currentTime.toISOString().substr(11, 12), 
        value: Number(currentValue.toFixed(2))
      });

      currentTime = new Date(currentTime.getTime() + intervalMs);
    }

    return data;
  }

  getData() {
    this.dataService.get(`/products`).subscribe({
      next: (res: any) => {
        console.log(this.selectedDate)
        this.data = {
          operatingTime: "21:15:00",
          downTime: "02:45:00",
          alarm: 2,
          status: 'Running',
          lut: '6:36:42 PM',
          energyData: 45,
          efficiency: 62,
          gauges: {
            efficiency: {
              value: 82,
              unit: '%'
            },
            energyProgress: {
              value: 45,
              unit: 'kWh'
            }
          },

          gantt: {
            machine: 'Machine 1',
            datas: [
              {
                name: 'Off',
                fromTo: '06:00:00-06:15:00',
                value: [0, 1734049800000, 1734050700000, 900],
                itemStyle: { color: '#b0b0b0' },
              },
              {
                name: 'Idle',
                fromTo: '06:15:00-06:40:30',
                value: [0, 1734050700000, 1734052230000, 1530],
                itemStyle: { color: '#f7c030' },
              },
              {
                name: 'Running',
                fromTo: '06:40:30-07:25:10',
                value: [0, 1734052230000, 1734054910000, 2670],
                itemStyle: { color: '#548237' },
              },
              {
                name: 'Idle',
                fromTo: '07:25:10-07:35:00',
                value: [0, 1734054910000, 1734055500000, 590],
                itemStyle: { color: '#f7c030' },
              },
              {
                name: 'Running',
                fromTo: '07:35:00-08:45:20',
                value: [0, 1734055500000, 1734059720000, 4220],
                itemStyle: { color: '#548237' },
              },
              {
                name: 'Off',
                fromTo: '08:45:20-09:10:00',
                value: [0, 1734059720000, 1734061200000, 1480],
                itemStyle: { color: '#b0b0b0' },
              },
              {
                name: 'Running',
                fromTo: '09:10:00-10:05:45',
                value: [0, 1734061200000, 1734064545000, 3345],
                itemStyle: { color: '#548237' },
              },
              {
                name: 'Idle',
                fromTo: '10:05:45-10:30:00',
                value: [0, 1734064545000, 1734066000000, 1455],
                itemStyle: { color: '#f7c030' },
              },
              {
                name: 'Running',
                fromTo: '10:30:00-11:50:00',
                value: [0, 1734066000000, 1734071400000, 5400],
                itemStyle: { color: '#548237' },
              },
              {
                name: 'Off',
                fromTo: '11:50:00-12:30:00',
                value: [0, 1734071400000, 1734073800000, 2400],
                itemStyle: { color: '#b0b0b0' },
              },
            ]
          },

          energy: {
            line: {
              unit: 'kWh',
              data: [
                { time: '00:00', value: 100 },
                { time: '00:10', value: 98 },
                { time: '00:15', value: 105 },
                { time: '00:45', value: 100 },
                { time: '01:21', value: 98 },
                { time: '01:45', value: 105 },
                { time: '01:56', value: 100 },
                { time: '02:00', value: 98 },
                { time: '02:12', value: 105 },
                { time: '02:37', value: 100 },
                { time: '02:45', value: 98 },
                { time: '03:00', value: 105 },
                { time: '03:18', value: 100 },
                { time: '03:34', value: 98 },
                { time: '03:58', value: 105 },
              ]
            },
            hourlyBar: {
              unit: 'kWh',
              data: [
                { hour: '00:00', value: 15 },
                { hour: '01:00', value: 18 },
                { hour: '02:00', value: 22 },
                { hour: '03:00', value: 15 },
                { hour: '04:00', value: 18 },
                { hour: '05:00', value: 22 }
              ]
            }
          }
        };
        this.data.energy.line.data = this.generateEnergyLineData(100, 5);
        this.machineStatus = this.data?.status
        this.getGauge(this.data?.efficiency || 0);
        this.getProgress(this.data?.energyData || 0);
        this.getLineChart(this.data?.energy || {});
        this.getganttChart(this.data?.gantt?.['datas'] || {});
      },
      error: (error) => {
        console.error(error),
          this.data = {
            operatingTime: "21:15:00",
            downTime: "02:45:00",
            alarm: 2,
            status: 'Running',
            lut: '6:36:42 PM',
            energyData: 45,
            efficiency: 62,
            gauges: {
              efficiency: {
                value: 82,
                unit: '%'
              },
              energyProgress: {
                value: 45,
                unit: 'kWh'
              }
            },

            gantt: {
              machine: 'Machine 1',
              datas: [
                {
                  name: 'Off',
                  fromTo: '06:00:00-06:15:00',
                  value: [0, 1734049800000, 1734050700000, 900],
                  itemStyle: { color: '#b0b0b0' },
                },
                {
                  name: 'Idle',
                  fromTo: '06:15:00-06:40:30',
                  value: [0, 1734050700000, 1734052230000, 1530],
                  itemStyle: { color: '#f7c030' },
                },
                {
                  name: 'Running',
                  fromTo: '06:40:30-07:25:10',
                  value: [0, 1734052230000, 1734054910000, 2670],
                  itemStyle: { color: '#548237' },
                },
                {
                  name: 'Idle',
                  fromTo: '07:25:10-07:35:00',
                  value: [0, 1734054910000, 1734055500000, 590],
                  itemStyle: { color: '#f7c030' },
                },
                {
                  name: 'Running',
                  fromTo: '07:35:00-08:45:20',
                  value: [0, 1734055500000, 1734059720000, 4220],
                  itemStyle: { color: '#548237' },
                },
                {
                  name: 'Off',
                  fromTo: '08:45:20-09:10:00',
                  value: [0, 1734059720000, 1734061200000, 1480],
                  itemStyle: { color: '#b0b0b0' },
                },
                {
                  name: 'Running',
                  fromTo: '09:10:00-10:05:45',
                  value: [0, 1734061200000, 1734064545000, 3345],
                  itemStyle: { color: '#548237' },
                },
                {
                  name: 'Idle',
                  fromTo: '10:05:45-10:30:00',
                  value: [0, 1734064545000, 1734066000000, 1455],
                  itemStyle: { color: '#f7c030' },
                },
                {
                  name: 'Running',
                  fromTo: '10:30:00-11:50:00',
                  value: [0, 1734066000000, 1734071400000, 5400],
                  itemStyle: { color: '#548237' },
                },
                {
                  name: 'Off',
                  fromTo: '11:50:00-12:30:00',
                  value: [0, 1734071400000, 1734073800000, 2400],
                  itemStyle: { color: '#b0b0b0' },
                },
              ]
            },

            energy: {
              line: {
                unit: 'kWh',
                data: [
                  { time: '00:00', value: 100 },
                  { time: '00:10', value: 98 },
                  { time: '00:15', value: 105 },
                  { time: '00:45', value: 100 },
                  { time: '01:21', value: 98 },
                  { time: '01:45', value: 105 },
                  { time: '01:56', value: 100 },
                  { time: '02:00', value: 98 },
                  { time: '02:12', value: 105 },
                  { time: '02:37', value: 100 },
                  { time: '02:45', value: 98 },
                  { time: '03:00', value: 105 },
                  { time: '03:18', value: 100 },
                  { time: '03:34', value: 98 },
                  { time: '03:58', value: 105 },
                ]
              },
              hourlyBar: {
                unit: 'kWh',
                data: [
                  { hour: '00:00', value: 15 },
                  { hour: '01:00', value: 18 },
                  { hour: '02:00', value: 22 },
                  { hour: '03:00', value: 15 },
                  { hour: '04:00', value: 18 },
                  { hour: '05:00', value: 22 }
                ]
              }
            }
          };
        this.data.energy.line.data = this.generateEnergyLineData(100, 5);
        this.machineStatus = this.data?.status
        this.getGauge(this.data?.efficiency || 0);
        this.getProgress(this.data?.energyData || 0);
        this.getLineChart(this.data?.energy || {});
        this.getganttChart(this.data?.gantt?.['datas'] || {});
      }
    });
  }

  getGauge(data: any) {
    this.gaugeOption = {
      series: [
        {
          type: 'gauge',
          startAngle: 225,
          endAngle: -45,
          min: 0,
          max: 100,
          radius: '90%',
          splitNumber: 5,
          axisLine: {
            lineStyle: {
              width: 25,
              color: [
                [0.5, '#FF6B6B'],
                [0.8, '#FFD93D'],
                [1, '#6BCB77'],
              ],
            },
          },
          pointer: {
            show: true,
            length: '70%',
            width: 4,
          },
          detail: {
            valueAnimation: true,
            formatter: '{value}%',
            color: 'black',
            fontSize: 16,
            fontWeight: 'bold',
            offsetCenter: [0, '80%'],
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
          data: [{ value: data || 0 }],
        },
      ],
    };
  }

  getProgress(data: any) {

    this.progressOption = {
      series: [
        {
          type: 'gauge',
          startAngle: 225,
          endAngle: -45,
          min: 0,
          max: 100,
          splitNumber: 5,
          radius: '90%',
          pointer: { length: '70%', width: 4 },
          detail: {
            formatter: '{value} kWh',
            fontSize: 16,
            fontWeight: 'bold',
            offsetCenter: [0, '80%'],
          },
          splitLine: { show: true, distance: -10 },
          axisLabel: { distance: -16 },
          data: [{ value: data || 0 }],
        },
      ],
    };
  }

  getganttChart(datas: any) {
    const data = datas ? datas : []

    const hasNoData = data.length === 0;

    if (hasNoData) {
      this.ganttOption = {
        title: {
          text: 'No Data Available',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: '#999',
            fontSize: 16,
            fontWeight: 'bold',
          },
        },
        tooltip: { show: false },
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
      };
      return;
    }

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
          height,
        },
        params.coordSys
      );

      return rect ? { type: 'rect', shape: rect, style: api.style() } : null;
    };

    this.ganttOption = {
      toolbox: {
        show: true,
        feature: {
          dataZoom: {
            yAxisIndex: 'none',
          },
          restore: {},
        },
      },
      title: {
        text: 'Gantt View',
      },
      tooltip: {
        formatter: (p: any) => `
          <b>Status:</b> ${p.data.name}<br/>
          <b>From-To:</b> ${p.data.fromTo}<br/>
          <b>Duration:</b> ${p.data.value[3]} sec
        `,
      },
      xAxis: {
        min: startTime,
        max: endTime,
        axisTick: {
          show: false,
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          formatter: (v: number) => moment(v).format('HH:mm:ss'),
        },
      },
      grid: { right: 5, left: 20, top: 50, bottom: 0 },
      yAxis: {
        type: 'category',
        data: ['Machine 1'],
        show: false,
      },
      dataZoom: [
        {
          type: 'inside',
          filterMode: 'weakFilter',
          start: 0,
          end: 100,
        },
      ],
      series: [
        {
          type: 'custom',
          renderItem,
          encode: { x: [1, 2], y: 0 },
          data,
        },
      ],
    };
  }

  getLineChart(energy: any) {

    const lineDataArr = energy?.line?.data ?? [];
    const barDataArr = energy?.hourlyBar?.data ?? [];

    const lineTime = lineDataArr.map((d: any) => d.time);
    const lineData = lineDataArr.map((d: any) => d.value);

    const barTime = barDataArr.map((d: any) => d.hour);
    const barData = barDataArr.map((d: any) => d.value);

    const hasNoData =
      lineDataArr.length === 0 &&
      barDataArr.length === 0;

    if (hasNoData) {
      this.lineOption = {
        title: {
          text: 'No Data Available',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: '#999',
            fontSize: 16,
            fontWeight: 'bold',
          },
        },
        tooltip: { show: false },
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
      };
      return;
    }

    this.lineOption = {
      toolbox: {
        show: true,
        feature: {
          restore: {},
        },
      },
      title: {
        text: 'Energy',
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
        },
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#999',
          },
        },
        formatter: function (params: any) {
          let tooltipText = params[0].axisValue + '<br/>';
          params.forEach((item: any) => {
            tooltipText +=
              item.marker + ' ' + item.seriesName + ': ' + item.data + '<br/>';
          });
          return tooltipText;
        },
      },

      grid: [
        {
          top: 50,
          left: 50,
          right: 30,
          height: '35%',
        },
        {
          left: 50,
          right: 30,
          top: '55%',
          height: '30%',
        },
      ],
      xAxis: [
        {
          type: 'category',
          data: lineTime,
          boundaryGap: false,
          gridIndex: 0,
          axisLine: {
            show: true,
            lineStyle: {
              color: '#000',
              width: 1,
            },
          },
          axisTick: { show: false },
          axisLabel: { show: false },
          splitLine: { show: false },
        },
        {
          type: 'category',
          data: barTime,
          boundaryGap: true,
          gridIndex: 1,
        },
      ],

      yAxis: [
        {
          type: 'value',
          name: 'kWh',
          nameLocation: 'middle',
          nameGap: 45,
          gridIndex: 0,
          axisTick: {
            show: false,
          },
          axisLine: {
            show: false,
          },
          splitLine: {
            show: false,
          },
        },
        {
          type: 'value',
          name: 'Hourly kWh',
          nameLocation: 'middle',
          nameGap: 45,
          gridIndex: 1,
          axisTick: {
            show: false,
          },
          axisLine: {
            show: false,
          },
          splitLine: {
            show: false,
          },
        },
      ],

      series: [
        {
          name: 'Current',
          type: 'line',
          data: lineData,
          xAxisIndex: 0,
          yAxisIndex: 0,
          symbol: 'none',
          smooth: true,
          sampling: 'lttb',
          itemStyle: {
            color: 'rgb(255, 70, 131)',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: 'rgb(255, 158, 68)',
              },
              {
                offset: 1,
                color: 'rgb(255, 70, 131)',
              },
            ]),
          },
        },

        {
          name: 'Hourly Consumption',
          type: 'bar',
          data: barData,
          xAxisIndex: 1,
          yAxisIndex: 1,
          barWidth: '60%',
          label: {
            show: true,
            position: 'top',
            fontWeight: 'bold',
            color: '#000',
            formatter: '{c}',
          },
        },
      ],
    };
  }

  gaugeOptionchartInstance: any;
  gaugeOptionChartInit(ec: any) {
    this.gaugeOptionchartInstance = ec;
  }
  ganttOptionchartInstance: any;
  ganttOptionChartInit(ec: any) {
    this.ganttOptionchartInstance = ec;
  }
  progressOptionchartInstance: any;
  progressOptionChartInit(ec: any) {
    this.progressOptionchartInstance = ec;
  }
  lineOptionchartInstance: any
  lineOptionChartInit(ec: any) {
    this.lineOptionchartInstance = ec;
  }
  openModel() {
    this.modalService.open(this.downloadtemplate, {
      centered: true,
      backdrop: 'static',
    });
  }
  getBase64Image(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d')?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => reject('Logo load failed');
    });
  }



  async downloadReport(e: any) {
    if (e === 'pdf') {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const contentSpacing = 8;

      const now = new Date();
      const downloadDateTime = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

      const logoBase64 = await this.getBase64Image('/WinLogo.png');

      const drawHeader = (doc: any) => {
        const y = 5;

        doc.addImage(logoBase64, 'PNG', margin, y, 30, 15);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Machine Performance Report', pageWidth / 2, y + 8, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${this.selectedDate}`, pageWidth / 2, y + 14, { align: 'center' });

        doc.setFontSize(9);
        doc.text(downloadDateTime, pageWidth - margin, y + 5, { align: 'right' });

        doc.setDrawColor(0);
        doc.line(margin, y + 18, pageWidth - margin, y + 18);
      };

      drawHeader(doc);

      let y = 25;

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        tableWidth: pageWidth - 2 * margin,
        head: [['Parameter', 'Value']],
        body: [
          ['Status', this.data.status],
          ['Operating Time', this.data.operatingTime],
          ['Down Time', this.data.downTime],
          ['Efficiency', this.data.efficiency + '%'],
          ['Energy', this.data.energyData + ' kWh'],
        ],
        headStyles: { fillColor: [0, 125, 121], textColor: 255 },
        bodyStyles: { fontSize: 10 },
        didDrawPage: () => drawHeader(doc),
      });

      y = (doc as any).lastAutoTable.finalY + contentSpacing;

      const ganttImg = this.ganttOptionchartInstance?.getDataURL({ pixelRatio: 2 });
      if (ganttImg) {
        const ganttHeight = 30;
        if (y + ganttHeight + 10 > pageHeight - margin) {
          doc.addPage();
          drawHeader(doc);
          y = 25;
        }
        doc.setFontSize(12);
        doc.text('Machine Timeline', margin, y);
        doc.addImage(ganttImg, 'PNG', margin, y + 5, pageWidth - 2 * margin, ganttHeight);
        y += ganttHeight + 10;
      }

      const lineImg = this.lineOptionchartInstance?.getDataURL({ pixelRatio: 2 });
      if (lineImg) {
        if (y + 60 > pageHeight - margin) {
          doc.addPage();
          drawHeader(doc);
          y = 25;
        }
        doc.setFontSize(12);
        doc.text('Energy Trend', margin, y);
        doc.addImage(lineImg, 'PNG', margin, y + 5, pageWidth - 2 * margin, 55);
        y += 65;
      }
      const hourlyData = this.data.energy.hourlyBar.data.map((d: any) => [
        d.hour,
        `${d.value} ${this.data.energy.hourlyBar.unit}`,
      ]);

      if (y + 20 > pageHeight - margin) {
        doc.addPage();
        drawHeader(doc);
        y = 25;
      }

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        tableWidth: pageWidth - 2 * margin,
        head: [['Hour', 'Energy Consumption']],
        body: hourlyData,
        headStyles: { fillColor: [0, 125, 121], textColor: 255 },
        bodyStyles: { fontSize: 10 },
        didDrawPage: () => drawHeader(doc),
      });

      doc.save(`Machine_Report_${this.selectedDate}.pdf`);
    } else if (e === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Machine Performance');

      const headerFill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '007D79' },
      };
      const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true };
      const borderAll = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      let rowIndex = 1;

      sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
      const titleCell = sheet.getCell(`A${rowIndex}`);
      titleCell.value = 'Machine Performance Report';
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center' };
      rowIndex++;

      sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
      sheet.getCell(`A${rowIndex}`).value = `Date: ${this.selectedDate}`;
      sheet.getCell(`A${rowIndex}`).alignment = { horizontal: 'center' };
      rowIndex++;

      sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
      sheet.getCell(`A${rowIndex}`).value = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
      sheet.getCell(`A${rowIndex}`).alignment = { horizontal: 'center' };
      rowIndex += 2;

      sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
      const summaryHeading = sheet.getCell(`A${rowIndex}`);
      summaryHeading.value = 'Summary Table';
      summaryHeading.font = { size: 12, bold: true };
      summaryHeading.alignment = { horizontal: 'center' };
      rowIndex++;

      sheet.getRow(rowIndex).values = ['Parameter', 'Value'];
      sheet.getRow(rowIndex).eachCell((cell: any) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.border = borderAll;
        cell.alignment = { horizontal: 'center' };
      });
      rowIndex++;

      const summaryData = [
        ['Status', this.data.status],
        ['Operating Time', this.data.operatingTime],
        ['Down Time', this.data.downTime],
        ['Efficiency', this.data.efficiency + '%'],
        ['Energy', this.data.energyData + ' kWh'],
      ];

      summaryData.forEach((row) => {
        sheet.addRow(row);
        sheet.getRow(rowIndex).eachCell((cell: any) => {
          cell.border = borderAll;
          cell.alignment = { horizontal: 'center' };
        });
        rowIndex++;
      });

      rowIndex += 2;

      sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
      const hourlyHeading = sheet.getCell(`A${rowIndex}`);
      hourlyHeading.value = 'Hourly Energy Table';
      hourlyHeading.font = { size: 12, bold: true };
      hourlyHeading.alignment = { horizontal: 'center' };
      rowIndex++;

      sheet.getRow(rowIndex).values = ['Hour', 'Energy Consumption'];
      sheet.getRow(rowIndex).eachCell((cell: any) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.border = borderAll;
        cell.alignment = { horizontal: 'center' };
      });
      rowIndex++;

      const hourlyData = this.data.energy.hourlyBar.data.map((d: any) => [
        d.hour,
        `${d.value} ${this.data.energy.hourlyBar.unit}`,
      ]);

      hourlyData.forEach((row: any) => {
        sheet.addRow(row);
        sheet.getRow(rowIndex).eachCell((cell: any) => {
          cell.border = borderAll;
          cell.alignment = { horizontal: 'center' };
        });
        rowIndex++;
      });

      sheet.columns = [
        { key: 'A', width: 25 },
        { key: 'B', width: 25 },
      ];

      workbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Machine_Report_${this.selectedDate}.xlsx`);
      });
    }
    this.modalService.dismissAll();
  }




}
