import { NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm!:FormGroup
  errorMessage = ''

  constructor(private fb: FormBuilder, private router: Router) {
    sessionStorage.removeItem('token')
    this.loginForm = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    })
  }

  saveData() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      if (email === 'admin' && password === 'admin') {
        sessionStorage.setItem('token', 'myToken');
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = 'Invalid username or password';
      }
    } else {
      this.errorMessage = 'Please fill in both fields';
    }
  }
}
