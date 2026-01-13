import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { MatIconModule } from '@angular/material/icon';



@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,MatIconModule],
  templateUrl: './devices.component.html',
  styleUrl: './devices.component.scss'
})
export class DevicesComponent implements OnInit {
  @ViewChild('deviceTemplate') deviceTemplate!: TemplateRef<any>;
  @ViewChild('devicedeleteTemplate') devicedeleteTemplate!: TemplateRef<any>;

  deviceData: any = [];
  deviceForm!: FormGroup;
  action: string = '';
  submit: boolean = false;
  _id: string = '';

  constructor(private modalService: NgbModal, private fb: FormBuilder) {

  }
  ngOnInit(): void {
    this.getDeviceData()
  }

  getDeviceData() {
    this.deviceData = [
    { deviceId: '55GHJ5165132', deviceName: 'Mach1', deviceType: 'CNC', deviceModal: 'Wim-1010', deviceController: 'Fanuc', deviceManufacture:'Wimera-K2',deviceMode:'AI',deviceFrequency:'50Hz',devicephaseSequence:'3P4W',devicepgaGainConfig:21845},
    { deviceId: '465CDS546562', deviceName: 'Mach2', deviceType: 'VMC', deviceModal: 'Wim-1010', deviceController: 'Focas', deviceManufacture:'Wimera-K2',deviceMode:'DIGITAL',deviceFrequency:'60Hz',devicephaseSequence:'2P3W',devicepgaGainConfig:21845}
    ]
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
      deviceMode:['DIGITAL',Validators.required]

    })
  }
  saveData() {
    this.submit = true;
    if (this.deviceForm.invalid) {
      return
    }
    if (this.action == 'Add') {

      console.log(this.deviceForm.value);
    } else {
      this.deviceForm.get('deviceId')?.enable();
      console.log(this.deviceForm.value);

    }
    this.cancel()
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
      deviceMode:[item.deviceMode,Validators.required]

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
    this.modalService.dismissAll()
  }
  cancel() {
    this.submit = false;
    this.deviceForm.reset();
    this.modalService.dismissAll()
  }

}
