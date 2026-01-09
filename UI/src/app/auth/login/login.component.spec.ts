import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent,ReactiveFormsModule],
      providers: [provideRouter([])] 
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router)
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('from need to be invalid initially',()=>{
    expect(component.loginForm.invalid).toBeFalsy
  })

  it('show error on empty form submit',()=>{
    component.saveData()
    expect(component.errorMessage).toBe('Please fill in both fields')
  })

  it('successfull message',()=>{
    spyOn(router,'navigate')
    component.loginForm.setValue({email:'admin',password:'admin'})
    component.saveData()
    expect(sessionStorage.getItem('token')).toBe('myToken')
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'])
  })

  it('should show error for wrong credentials', () => {
    component.loginForm.setValue({ email: 'wrong', password: 'user' });
    component.saveData();

    expect(sessionStorage.getItem('token')).toBeNull();
    expect(component.errorMessage).toBe('Invalid username or password');
  });


});
