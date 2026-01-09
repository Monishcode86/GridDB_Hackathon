import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user',
  imports: [CommonModule],
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss'
})
export class UserComponent implements OnInit {
    constructor(private http: HttpClient) {
  }
  data:any=[]
  ngOnInit() {
    this.getData()
  }

  getData() {
    this.http.get('https://dummyjson.com/products').subscribe({
      next: (res:any) =>{
      console.log(res,"rrrrrr") 
      this.data = res['products'];
      },
      error: (error:any) => console.log(error,"eeeeee"),
      complete: () => console.log('Request completed')
    })
  }
}
