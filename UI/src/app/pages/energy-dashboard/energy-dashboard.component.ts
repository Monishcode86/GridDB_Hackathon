import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';

import { DataService } from '../../services/dataService';
import { NgxEchartsDirective } from 'ngx-echarts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
import { MatIconModule } from '@angular/material/icon';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

echarts.use([
  GridComponent,
  TooltipComponent,
  ToolboxComponent,
  DataZoomComponent,
  LineChart,
  CanvasRenderer,
]);

@Component({
  selector: 'app-energy-dashboard',
  standalone: true,
  imports: [FormsModule, CommonModule, NgxEchartsDirective, MatIconModule],
  templateUrl: './energy-dashboard.component.html',
  styleUrl: './energy-dashboard.component.scss',
})
export class EnergyDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('downloadtemplate') downloadtemplate!: TemplateRef<any>;

  machines: any[] = [];
  selectedMachine = '';
  selectedDate = new Date().toISOString().split('T')[0];

  reportData: any;
  lineOption: any;
  today: string = new Date().toISOString().split('T')[0];
  isCurrent: boolean = true;
  deviceIntervalSub!: Subscription;

  constructor(
    private dataService: DataService,
    private modalService: NgbModal,
  ) {}

  ngOnInit(): void {
    this.getDevice();
  }

  ngOnDestroy(): void {
    if (this.deviceIntervalSub) {
      this.deviceIntervalSub.unsubscribe();
    }
  }

  getDevice() {
    this.dataService.get('/device').subscribe({
      next: (res: any) => {
        this.machines = res;
        if (this.machines.length) {
          this.selectedMachine = this.machines[0].deviceId;
          this.getData();

          this.deviceIntervalSub = interval(60000).subscribe(() => {
            this.getData();
          });
        }
      },
      error: console.error,
    });
  }

  changeDevice(e: any) {
    this.getData();
  }
  changemmainDate(e: any) {
    this.isCurrent = false;
    this.getData();
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
    this.getData();
  }

  getData() {
    this.dataService
      .get(
        `/parameterMetrics?deviceId=${this.selectedMachine}&date=${this.selectedDate}`,
      )
      .subscribe({
        next: (res: any) => {
          this.reportData = res;
          console.log('API DATA', res);
          this.getProgress(this.reportData?.['TotalEnergy'] || 0);
          this.getRealProgress(this.reportData?.['TotalReal_power'] || 0);
          this.getApparentProgress(
            this.reportData?.['TotalApparent_power'] || 0,
          );
          this.getReactiveProgress(
            this.reportData?.['TotalReactive_power'] || 0,
          );

          this.buildLineChart(res);
          this.buildLinevoltageChart(res);
          this.buildLinepowerFactorChart(res);
        },
        error: console.error,
      });
  }

  buildLineChart(data: any) {
    const time = data?.TimeStamp || [];
    const currentR = data?.Current_R || [];
    const currentY = data?.Current_Y || [];
    const currentB = data?.Current_B || [];

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
        {
          name: 'Current Y',
          type: 'line',
          data: currentY,
          smooth: true,
          symbol: 'none',
          sampling: 'lttb',
        },
        {
          name: 'Current B',
          type: 'line',
          data: currentB,
          smooth: true,
          symbol: 'none',
          sampling: 'lttb',
        },
      ],
    };
  }
  linevoltageOption: any;
  buildLinevoltageChart(data: any) {
    const time = data?.TimeStamp || [];
    const voltageR = data?.Voltage_R || [];
    const voltageY = data?.Voltage_Y || [];
    const voltageB = data?.Voltage_B || [];

    if (!time.length) {
      this.linevoltageOption = {
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

    this.linevoltageOption = {
      title: {
        text: 'Voltage Trend (R / Y / B)',
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
        name: 'Voltage (V)',
      },

      series: [
        {
          name: 'Voltage R',
          type: 'line',
          data: voltageR,
          smooth: true,
          symbol: 'none',
          sampling: 'lttb',
        },
        {
          name: 'Voltage Y',
          type: 'line',
          data: voltageY,
          smooth: true,
          symbol: 'none',
          sampling: 'lttb',
        },
        {
          name: 'Voltage B',
          type: 'line',
          data: voltageB,
          smooth: true,
          symbol: 'none',
          sampling: 'lttb',
        },
      ],
    };
  }
  linepowerfoactorOption: any;
  buildLinepowerFactorChart(data: any) {
    const time = data?.TimeStamp || [];
    const powerFactorR = data?.PowerFactor_R || [];
    const powerFactorY = data?.PowerFactor_Y || [];
    const powerFactorB = data?.PowerFactor_B || [];

    if (!time.length) {
      this.linepowerfoactorOption = {
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

    this.linepowerfoactorOption = {
      title: {
        text: 'Powerfactor Trend (R / Y / B)',
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
        name: 'PowerFactor',
      },

      series: [
        {
          name: 'powerfactor R',
          type: 'line',
          data: powerFactorR,
          smooth: true,
          symbol: 'none',
          sampling: 'lttb',
        },
        {
          name: 'powerfactor Y',
          type: 'line',
          data: powerFactorY,
          smooth: true,
          symbol: 'none',
          sampling: 'lttb',
        },
        {
          name: 'powerfactor B',
          type: 'line',
          data: powerFactorB,
          smooth: true,
          symbol: 'none',
          sampling: 'lttb',
        },
      ],
    };
  }

  lineOptionchartInstance: any;
  lineOptionChartInit(ec: any) {
    this.lineOptionchartInstance = ec;
  }

  linevoltageOptionchartInstance: any;
  linevoltageOptionChartInit(ec: any) {
    this.linevoltageOptionchartInstance = ec;
  }

  linepowerfactorOptionchartInstance: any;
  linepowerfactorOptionChartInit(ec: any) {
    this.linepowerfactorOptionchartInstance = ec;
  }

  progressOption: any;
  getProgress(data: any) {
    const value = Number(data ?? 0).toFixed(2);
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
            offsetCenter: [0, '105%'],
          },
          splitLine: { show: true, distance: -10 },
          axisLabel: { distance: -16 },
          data: [{ value: gaugeValue || 0 }],
        },
      ],
    };
  }
  progressOptionchartInstance: any;
  progressOptionChartInit(ec: any) {
    this.progressOptionchartInstance = ec;
  }

  progressRealOption: any;
  getRealProgress(data: any) {
    const rawValue = Number(data ?? 0);

    const isKW = rawValue >= 1000;
    const displayValue = isKW ? rawValue / 1000 : rawValue;
    const unit = isKW ? 'kW' : 'W';

    let max = 10;
    if (displayValue > 0) {
      const magnitude = Math.pow(10, Math.floor(Math.log10(displayValue)));
      max = Math.ceil(displayValue / magnitude) * magnitude;
    }

    this.progressRealOption = {
      series: [
        {
          type: 'gauge',
          startAngle: 225,
          endAngle: -45,
          min: 0,
          max: max,
          splitNumber: 5,
          radius: '90%',

          pointer: { length: '70%', width: 4 },

          detail: {
            formatter: (val: number) => {
              return isKW ? `${val.toFixed(2)} kW` : `${val.toFixed(0)} W`;
            },
            fontSize: 14,
            fontWeight: 'bold',
            offsetCenter: [0, '105%'],
          },

          splitLine: { show: true, distance: -10 },
          axisLabel: { distance: -16 },

          data: [{ value: displayValue }],
        },
      ],
    };
  }

  progressRealOptionchartInstance: any;
  progressRealOptionChartInit(ec: any) {
    this.progressRealOptionchartInstance = ec;
  }

  progressReactiveOption: any;
  getReactiveProgress(data: any) {
    const rawValue = Number(data ?? 0);

    const isKVAR = rawValue >= 1000;
    const displayValue = isKVAR ? rawValue / 1000 : rawValue;
    const unit = isKVAR ? 'kVAR' : 'VAR';

    let max = 10;
    if (displayValue > 0) {
      const magnitude = Math.pow(10, Math.floor(Math.log10(displayValue)));
      max = Math.ceil(displayValue / magnitude) * magnitude;
    }

    this.progressReactiveOption = {
      series: [
        {
          type: 'gauge',
          startAngle: 225,
          endAngle: -45,
          min: 0,
          max: max,
          splitNumber: 5,
          radius: '90%',

          pointer: { length: '70%', width: 4 },

          detail: {
            formatter: (val: number) => {
              return isKVAR
                ? `${val.toFixed(2)} kVAR`
                : `${val.toFixed(0)} VAR`;
            },
            fontSize: 14,
            fontWeight: 'bold',
            offsetCenter: [0, '105%'],
          },

          splitLine: { show: true, distance: -10 },
          axisLabel: { distance: -16 },

          data: [{ value: displayValue }],
        },
      ],
    };
  }

  progressReactiveOptionchartInstance: any;
  progressReactiveOptionChartInit(ec: any) {
    this.progressReactiveOptionchartInstance = ec;
  }

  progressApparentOption: any;
  getApparentProgress(data: any) {
    const rawValue = Number(data ?? 0);

    const isKVA = rawValue >= 1000;
    const displayValue = isKVA ? rawValue / 1000 : rawValue;
    const unit = isKVA ? 'kVA' : 'VA';

    let max = 10;
    if (displayValue > 0) {
      const magnitude = Math.pow(10, Math.floor(Math.log10(displayValue)));
      max = Math.ceil(displayValue / magnitude) * magnitude;
    }

    this.progressApparentOption = {
      series: [
        {
          type: 'gauge',
          startAngle: 225,
          endAngle: -45,
          min: 0,
          max: max,
          splitNumber: 5,
          radius: '90%',

          pointer: { length: '70%', width: 4 },

          detail: {
            formatter: (val: number) => {
              return isKVA ? `${val.toFixed(2)} kVA` : `${val.toFixed(0)} VA`;
            },
            fontSize: 14,
            fontWeight: 'bold',
            offsetCenter: [0, '105%'],
          },

          splitLine: { show: true, distance: -10 },
          axisLabel: { distance: -16 },

          data: [{ value: displayValue }],
        },
      ],
    };
  }

  progressApparentOptionchartInstance: any;
  progressApparentOptionChartInit(ec: any) {
    this.progressApparentOptionchartInstance = ec;
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
  async downloadReport(type: string) {
    if (type !== 'pdf') return;

    await new Promise((res) => setTimeout(res, 300));

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 10;
    const headerHeight = 25;
    const spacing = 8;

    const now = new Date();
    const downloadTime = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

    const logoBase64 = await this.getBase64Image('/WinLogo.png');

    const drawHeader = () => {
      doc.addImage(logoBase64, 'PNG', margin, 5, 30, 15);

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Energy Monitoring Report', pageWidth / 2, 12, {
        align: 'center',
      });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${this.selectedDate}`, pageWidth / 2, 18, {
        align: 'center',
      });

      doc.setFontSize(9);
      doc.text(downloadTime, pageWidth - margin, 10, { align: 'right' });

      doc.line(margin, 22, pageWidth - margin, 22);
    };

    drawHeader();

    let y = headerHeight + spacing;

    const gaugeHeight = 35;
    const gaugeWidth = (pageWidth - margin * 2) / 4 - 2;

    const gaugeConfigs = [
      { title: 'Energy', chart: this.progressOptionchartInstance },
      { title: 'Real Power', chart: this.progressRealOptionchartInstance },
      {
        title: 'Reactive Power',
        chart: this.progressReactiveOptionchartInstance,
      },
      {
        title: 'Apparent Power',
        chart: this.progressApparentOptionchartInstance,
      },
    ];

    let x = margin;

    gaugeConfigs.forEach((g) => {
      if (!g.chart) return;

      const img = g.chart.getDataURL({
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      doc.addImage(img, 'PNG', x, y, gaugeWidth, gaugeHeight);

      doc.setFontSize(9);
      doc.text(g.title, x + gaugeWidth / 2, y + gaugeHeight + 4, {
        align: 'center',
      });

      x += gaugeWidth + 2;
    });

    y += gaugeHeight + 14;

    const drawLineChart = (title: string, chart: any) => {
      if (!chart) return;

      const img = chart.getDataURL({
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      if (y + 65 > pageHeight - margin) {
        doc.addPage();
        drawHeader();
        y = headerHeight + spacing;
      }

      doc.setFontSize(12);
      doc.text(title, margin, y);

      doc.addImage(img, 'PNG', margin, y + 5, pageWidth - margin * 2, 55);
      y += 65;
    };

    drawLineChart('Current Trend (R / Y / B)', this.lineOptionchartInstance);
    drawLineChart(
      'Voltage Trend (R / Y / B)',
      this.linevoltageOptionchartInstance,
    );
    drawLineChart(
      'Power Factor Trend (R / Y / B)',
      this.linepowerfactorOptionchartInstance,
    );

    doc.save(`Energy_Report_${this.selectedDate}.pdf`);

    this.modalService.dismissAll();
  }

  openModel() {
    this.modalService.open(this.downloadtemplate, {
      centered: true,
      backdrop: 'static',
    });
  }
}
