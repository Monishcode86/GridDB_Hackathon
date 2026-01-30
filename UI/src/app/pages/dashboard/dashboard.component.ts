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
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { interval, Subject, Subscription } from 'rxjs';

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
import { DateHoursToTimePipePipe } from '../../services/pipes/date-hours-to-time-pipe.pipe';

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
  imports: [FormsModule, CommonModule, NgxEchartsDirective, MatIconModule, DateHoursToTimePipePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {

  private ws!: WebSocket;
  private reconnectTimeout: any;
  private destroyed = false;

  machines: any[] = [];
  @ViewChild('downloadtemplate') downloadtemplate!: TemplateRef<any>;
  @ViewChild('alerttemplate') alerttemplate!: TemplateRef<any>;
  selectedMachine: string = '';
  selectedDate: string = new Date().toISOString().split('T')[0];
  machineStatus: string = 'Off';
  lastUpdatedTime: string = new Date().toLocaleTimeString();
  option: any;
  gaugeOption: any;
  progressOption: any;
  lineOption: any;
  ganttOption: any;
  metricdata: any = {};
  today: string = new Date().toISOString().split('T')[0];
  isCurrent: boolean = true;
  mqttdata: any;
  ganttdata: any;
  deviceIntervalSub: any;
  avail: any;
  performance: any;
  quality: any;


  constructor(private modalService: NgbModal, private dataService: DataService) { }

  ngOnInit() {
    this.getDevice()

  }
  getDevice() {
    this.dataService.get(`/device`).subscribe({
      next: (res: any) => {
        this.machines = res
        this.selectedMachine = this.machines[0]['deviceId']

        this.getData();
        this.getganttData();
        if (this.deviceIntervalSub) {
          this.deviceIntervalSub.unsubscribe();
        }
        this.deviceIntervalSub = interval(30000).subscribe(() => {
          this.getData();
          this.getganttData();

        });
      },
      error: (error) => {
        console.error(error)

      }
    });
  }
  machinealarmStatus: any = []
  getganttData() {
    this.dataService.get(`/ganttChart?deviceId=${this.selectedMachine}&date=${this.selectedDate}`).subscribe({
      next: (res: any) => {
        this.ganttdata = res
        this.machineStatus = this.ganttdata?.['status']?.['status'];
        this.machinealarmStatus = this.ganttdata?.['status']?.['alerts'];
        this.getganttChart(this.ganttdata?.ganttChart || []);
        this.avail = Number(this.ganttdata?.status?.availability || 0).toFixed(1);
        this.performance = Number(this.ganttdata?.status?.performance || 0).toFixed(1);
        this.quality = Number(this.ganttdata?.status?.quality || 0).toFixed(1);

        this.getGauge(this.ganttdata?.['status']?.efficiency || 0);
        this.getProgress(this.ganttdata?.['status']?.energyData || 0);
        this.mqttdata = this.ganttdata?.['status']?.['alertsCount'];
      },
      error: (error) => {
        console.error(error)

      }
    });
  }

  changeDevice(e: any) {
    this.getData();
    this.getganttData();
  }
  changemmainDate(e: any) {
    this.isCurrent = false;
    this.getData();
    this.getganttData();
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
    this.getganttData();
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
  partCount: any = [];
  partDta: any;
  getData() {
    this.dataService.get(`/energyMetrics?deviceId=${this.selectedMachine}&date=${this.selectedDate}`).subscribe({
      next: (res: any) => {
        this.metricdata = res;
        this.getLineChart(this.metricdata || {});
        this.partCount = this.metricdata?.partCount;
        this.partDta = this.partCount.reduce(
          (sum: number, val: number) => sum + val,
          0
        );
      },
      error: (error) => {
        console.error(error)
      }
    });
  }

  getGauge(data: any) {
    const value = Number(data ?? 0).toFixed(2);
    const gaugeValue = Number(value);
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
          data: [{ value: gaugeValue || 0 }],
        },
      ],
    };
  }

  getProgress(data: any) {
    const value = Number(data ?? 0).toFixed(4);
    const gaugeValue = Number(value);
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
            fontSize: 14,
            fontWeight: 'bold',
            offsetCenter: [0, '100%'],
          },
          splitLine: { show: true, distance: -10 },
          axisLabel: { distance: -16 },
          data: [{ value: gaugeValue || 0 }],
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
        trigger: "item",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        borderColor: "#fff",
        borderWidth: 1,
        textStyle: {
          color: "#fff",
          fontSize: 14,
        },
        padding: 10,
        extraCssText:
          "border-radius: 8px; box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.5);",
        formatter: function (params: any) {
          var data = params.data;
          var statusColor =
            data.name === "Running"
              ? "#77ff5c"
              : data.name === "Idle"
                ? "#f9fc4d"
                : data.name === "Off"
                  ? "#b0b0b0"
                  : data.name === "Breakdown"
                    ? "#eb5857"
                    : "grey";

          return `
            <div style="text-align: left; font-family: Arial, sans-serif; line-height: 1.5;">
              <p style="margin: 5px 0; font-size: 16px;">
              <strong>Status :</strong>
              <span style="color: ${statusColor}; font-weight: bold;">${data.name}</span>
              </p>
              <p style="margin: 5px 0;"><strong>From-To :</strong> ${data.fromTo}</p>
              <p style="margin: 5px 0;"><strong>Duration :</strong> ${data.value[3]}</p>
            </div>
          `;
        },
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

    const lineTime = energy?.timeStamp ?? [];
    const lineData = energy?.energy ?? [];
    const partData = energy?.partCount ?? [];
    const markPoints = partData
      .map((val: number, index: number) => {
        if (val) {
          return {
            name: 'Part Produced',
            coord: [lineTime[index], lineData[index]],
            value: val, 
            tooltip: {
              formatter: `
            <b>Part Produced</b><br/>
            Time: ${lineTime[index]}<br/>
            Energy: ${Number(lineData[index]).toFixed(2)} kWh<br/>
            Part Count: ${val}
          `,
            },
          };
        }
        return null;
      })
      .filter(Boolean);


    const hourRanges: string[] = energy?.hours ?? [];

    const barData = energy?.hourlyEnergy;

    const hasNoData = lineTime?.length === 0 && lineData?.length === 0 && hourRanges?.length === 0 && barData?.length === 0;

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
        axisPointer: { type: 'cross' },

        formatter: (params: any) => {
          let text = '';

          params.forEach((p: any) => {
            if (p.seriesType === 'bar') {
              const range = hourRanges[p.dataIndex]; 
              text += `
              <b>Hour:</b> ${range}<br/>
              ${p.marker} ${p.seriesName}: <b>${p.data} kWh</b><br/>
            `;
            }
            if (p.seriesType === 'line') {
              text += `
              ${p.marker} ${p.seriesName}: <b>${Number(p.data).toFixed(2)} kWh</b><br/>
            `;
            }
          });

          return text;
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
          axisLabel: { show: false },
        },
        {
          type: 'category',
          gridIndex: 1,
          data: hourRanges,
          axisLabel: {
            formatter: (value: string) => value.split('-')[0], // "00:00"
          },
        }
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
          name: 'Energy',
          type: 'line',
          data: lineData,
          xAxisIndex: 0,
          yAxisIndex: 0,
          symbol: 'none',
          smooth: true,
          sampling: 'lttb',
          markPoint: {
            symbolSize: 40,        
            itemStyle: {
              color: '#1dc38c',
              borderColor: '#fff',
              borderWidth: 2,
            },

            label: {
              show: true,
              formatter: (params: any) => {
                return `${params.value}`;  
              },
              fontSize: 11,
              fontWeight: 'bold',
            },
            data: markPoints,
          },

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
  alertModel() {
    if (this.machinealarmStatus.length) {
      this.modalService.open(this.alerttemplate, {
        centered: true,
        backdrop: 'static',
        size: 'lg',
      });
    }
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

  formatHoursToTime(hours: number = 0): string {
    const totalSeconds = Math.round(hours * 3600);

    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');

    return `${h}:${m}:${s}`;
  }

  formatFixed(value: any): string {
    return value !== null && value !== undefined
      ? Number(value).toFixed(2)
      : '0.00';
  }


  async downloadReport(e: any) {
    if (e === 'pdf') {

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const margin = 10;
      const headerHeight = 25;
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

      let y = headerHeight + contentSpacing;

      autoTable(doc, {
        startY: y,
        margin: {
          top: headerHeight,
          left: margin,
          right: margin,
          bottom: margin,
        },
        head: [['Parameter', 'Value']],
        body: [
          ['Efficiency', `${this.formatFixed(this.ganttdata?.status?.efficiency)} %`],
          ['Availability', `${this.formatFixed(this.ganttdata?.status?.availability)} %`],
          ['Performance', `${this.formatFixed(this.ganttdata?.status?.performance)} %`],
          ['Quality', `${this.formatFixed(this.ganttdata?.status?.quality)} %`],
          ['Running Time', `${this.ganttdata?.status?.running} hrs`],
          ['Idle Time', `${this.ganttdata?.status?.idle} hrs`],
          ['Breakdown Time', `${this.ganttdata?.status?.breakdown} hrs`],
          ['Off Time', `${this.ganttdata?.status?.off} hrs`],
          ['Part Count', this.partDta || 0],
          ['Energy', `${this.formatFixed(this.ganttdata?.status?.energyData)} kWh`],
          ['Alarm', this.ganttdata?.status?.alertsCount ?? 0],
        ],
        headStyles: { fillColor: [0, 125, 121], textColor: 255 },
        bodyStyles: { fontSize: 10 },
        showHead: 'everyPage',
        didDrawPage: () => drawHeader(doc),
      });

      y = (doc as any).lastAutoTable.finalY + contentSpacing;

      const ganttImg = this.ganttOptionchartInstance?.getDataURL({ pixelRatio: 2 });
      if (ganttImg) {
        if (y + 40 > pageHeight - margin) {
          doc.addPage();
          drawHeader(doc);
          y = headerHeight + contentSpacing;
        }

        doc.setFontSize(12);
        doc.text('Machine Timeline', margin, y);
        doc.addImage(ganttImg, 'PNG', margin, y + 5, pageWidth - 2 * margin, 30);
        y += 40;
      }

      const lineImg = this.lineOptionchartInstance?.getDataURL({ pixelRatio: 2 });
      if (lineImg) {
        if (y + 65 > pageHeight - margin) {
          doc.addPage();
          drawHeader(doc);
          y = headerHeight + contentSpacing;
        }

        doc.setFontSize(12);
        doc.text('Energy Trend', margin, y);
        doc.addImage(lineImg, 'PNG', margin, y + 5, pageWidth - 2 * margin, 55);
        y += 65;
      }

      const hourlyTableBody = (this.metricdata?.hours || []).map(
        (hour: string, index: number) => [
          hour,
          `${this.formatFixed(this.metricdata?.hourlyEnergy?.[index])} kWh`
        ]
      );

      autoTable(doc, {
        startY: y,
        margin: {
          top: headerHeight,
          left: margin,
          right: margin,
          bottom: margin,
        },
        head: [['Hour', 'Energy Consumption']],
        body: hourlyTableBody,
        headStyles: { fillColor: [0, 125, 121], textColor: 255 },
        bodyStyles: { fontSize: 10 },
        showHead: 'everyPage',
        didDrawPage: () => drawHeader(doc),
      });

      doc.save(`Machine_Report_${this.selectedDate}.pdf`);
    }
    else if (e === 'excel') {

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
      sheet.getCell(`A${rowIndex}`).value = 'Machine Performance Report';
      sheet.getCell(`A${rowIndex}`).font = { size: 16, bold: true };
      sheet.getCell(`A${rowIndex}`).alignment = { horizontal: 'center' };
      rowIndex++;

      sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
      sheet.getCell(`A${rowIndex}`).value = `Date: ${this.selectedDate}`;
      sheet.getCell(`A${rowIndex}`).alignment = { horizontal: 'center' };
      rowIndex++;

      sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
      sheet.getCell(`A${rowIndex}`).value = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
      sheet.getCell(`A${rowIndex}`).alignment = { horizontal: 'center' };
      rowIndex += 2;

      sheet.getRow(rowIndex).values = ['Parameter', 'Value'];
      sheet.getRow(rowIndex).eachCell((c: any) => {
        c.fill = headerFill;
        c.font = headerFont;
        c.border = borderAll;
        c.alignment = { horizontal: 'center' };
      });
      rowIndex++;

      [
        ['Efficiency', `${this.formatFixed(this.ganttdata?.status?.efficiency)} %`],
        ['Availability', `${this.formatFixed(this.ganttdata?.status?.availability)} %`],
        ['Performance', `${this.formatFixed(this.ganttdata?.status?.performance)} %`],
        ['Quality', `${this.formatFixed(this.ganttdata?.status?.quality)} %`],
        ['Running Time', `${this.ganttdata?.status?.running} hrs`],
        ['Idle Time', `${this.ganttdata?.status?.idle} hrs`],
        ['Breakdown Time', `${this.ganttdata?.status?.breakdown} hrs`],
        ['Off Time', `${this.ganttdata?.status?.off} hrs`],
        ['Part Count', this.partDta || 0],
        ['Energy', `${this.formatFixed(this.ganttdata?.status?.energyData)} kWh`],
        ['Alarm', this.ganttdata?.status?.alertsCount ?? 0],
      ].forEach(row => {
        sheet.addRow(row);
        sheet.getRow(rowIndex).eachCell((c: any) => {
          c.border = borderAll;
          c.alignment = { horizontal: 'center' };
        });
        rowIndex++;
      });

      rowIndex += 2;

      sheet.getRow(rowIndex).values = ['Hour', 'Energy Consumption'];
      sheet.getRow(rowIndex).eachCell((c: any) => {
        c.fill = headerFill;
        c.font = headerFont;
        c.border = borderAll;
        c.alignment = { horizontal: 'center' };
      });
      rowIndex++;

      (this.metricdata?.hours || []).forEach((hour: string, i: number) => {
        sheet.addRow([
          hour,
          `${this.formatFixed(this.metricdata?.hourlyEnergy?.[i])} kWh`
        ]);

        sheet.getRow(rowIndex).eachCell((c: any) => {
          c.border = borderAll;
          c.alignment = { horizontal: 'center' };
        });

        rowIndex++;
      });


      sheet.columns = [{ width: 25 }, { width: 25 }];

      workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        saveAs(blob, `Machine_Report_${this.selectedDate}.xlsx`);
      });
    }
    this.modalService.dismissAll();
  }



  ngOnDestroy() {
    this.destroyed = true;
    if (this.ws) {
      this.ws.close();
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.deviceIntervalSub) {
      this.deviceIntervalSub.unsubscribe();
    }

  }

}
