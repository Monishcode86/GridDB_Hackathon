import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";


@Injectable({
  providedIn: "root",
})
export class DataService {
  url = environment.apiUrl;
  
  constructor(private http: HttpClient) {}

  get(params:any) {
    return this.http.get(this.url + params);
  }

  post(params:any, data:any) {
    return this.http.post(this.url + params, data);
  }

  put(params:any, data:any) {
    return this.http.put(this.url + params, data);
  }

  delete(params:any) {
    return this.http.delete(this.url + params);
  }


}
