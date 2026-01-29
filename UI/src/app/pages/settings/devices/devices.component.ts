import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../../../services/dataService';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './devices.component.html',
  styleUrl: './devices.component.scss'
})

export class DevicesComponent implements OnInit {

  @ViewChild('deviceTemplate') deviceTemplate!: TemplateRef<any>;
  @ViewChild('devicedeleteTemplate') devicedeleteTemplate!: TemplateRef<any>;

  private dataservice = inject(DataService)
  deviceData: any = [];
  deviceForm!: FormGroup;
  action: string = '';
  submit: boolean = false;
  _id: string = '';

  constructor(private modalService: NgbModal, private fb: FormBuilder) { }

  ngOnInit(): void {
    this.getDeviceData()
  }

  getDeviceData() {
    this.dataservice.get('/device').subscribe({
      next: ((res: any) => {
        if (res.length) {
          this.deviceData = res;
        } else {
          this.deviceData = [];
        }
      }),
      error: ((error: any) => {
        this.deviceData = [];
      })

    })

  }

  addDevice() {
    this.action = 'Add'
    this.modalService.open(this.deviceTemplate, {
      centered: true,
      backdrop: 'static',
      size: 'lg'
    });
    this.initializeForm()
  }

  initializeForm() {
    this.deviceForm = this.fb.group({
      deviceId: ['', Validators.required],
      deviceName: ['', Validators.required],
      deviceType: ['CNC', Validators.required],
      deviceController: ['', Validators.required],
      deviceModal: ['Wim-1010', Validators.required],
      deviceManufacture: ['Wimera-K2', Validators.required],
      deviceFrequency: ['60Hz', Validators.required],
      devicephaseSequence: ['3P4W', Validators.required],
      devicepgaGainConfig: [21845, Validators.required],
      deviceMode: ['DIGITAL', Validators.required]

    })
  }
  devId: any
  saveData() {
    this.submit = true;
    if (this.deviceForm.invalid) {
      return
    }
    this.devId = this.deviceForm.get('deviceId')?.value
    console.log(this.deviceForm.get('deviceId')?.value, this.deviceForm.value)
    if (this.action == 'Add') {
      this.dataservice.post('/device', this.deviceForm.value).subscribe({
        next: ((res: any) => {

          this.getDeviceData();
          this.createCertificate()
        }),
        error: ((error: any) => {
        })
      })
      console.log(this.deviceForm.value);
    } else {
      this.deviceForm.get('deviceId')?.enable();
      console.log(this.deviceForm.value);
      this.dataservice.put('/device', this.deviceForm.value).subscribe({
        next: ((res: any) => {
          this.getDeviceData();
        }),
        error: ((error: any) => {
        })
      })
    }
    this.cancel()
  }

  createCertificate() {

    let obj = {
      deviceId: this.devId
    }
    this.dataservice.post('/certificate', obj).subscribe({
      next: ((res: any) => {
      }),
      error: ((error: any) => {
      })
    })
  }

  editDevice(item: any) {
    console.log(item)
    this.action = 'Edit'
    this.modalService.open(this.deviceTemplate, {
      centered: true,
      backdrop: 'static',
      size: 'lg'
    });
    this.deviceForm = this.fb.group({
      deviceId: [item.deviceId, Validators.required],
      deviceName: [item.deviceName, Validators.required],
      deviceType: [item.deviceType, Validators.required],
      deviceController: [item.deviceController, Validators.required],
      deviceModal: [item.deviceModal, Validators.required],
      deviceManufacture: [item.deviceManufacture, Validators.required],
      deviceFrequency: [item.deviceFrequency, Validators.required],
      devicephaseSequence: [item.devicephaseSequence, Validators.required],
      devicepgaGainConfig: [item.devicepgaGainConfig, Validators.required],
      deviceMode: [item.deviceMode, Validators.required]

    })
    this.deviceForm.get('deviceId')?.disable();

  }

  opendeleteDevice(id: string) {
    this._id = id
    this.modalService.open(this.devicedeleteTemplate, {
      centered: true,
      backdrop: 'static',
      size: 'lg'
    });
  }

  deleteDevice() {
    console.log(this._id)
    this.dataservice.delete(`/device?deviceId=${this._id}`).subscribe({
      next: ((res: any) => {
        this.getDeviceData();
        this.deleteCertificate();
      }),
      error: ((error: any) => {
      })
    })
    this.cancel()

  }

  deleteCertificate() {
    let obj = {
      deviceId: this._id
    }
    console.log(this._id, obj)
    this.dataservice.delete(`/certificate?deviceId=${this._id}`).subscribe({
      next: ((res: any) => {

      }),
      error: ((error: any) => {
      })
    })
  }

  cancel() {
    this.submit = false;
    this.modalService.dismissAll();
    this.deviceForm?.reset();
  }

}
