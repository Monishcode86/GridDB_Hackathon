import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateHoursToTimePipe',
  standalone: true
})
export class DateHoursToTimePipePipe implements PipeTransform {

   transform(hours: number): string {
    if (!hours && hours !== 0) return '00:00:00';

    const totalSeconds = Math.floor(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    return `${this.pad(h)}:${this.pad(m)}:${this.pad(s)}`;
  }

  private pad(num: number): string {
    return num.toString().padStart(2, '0');
  }

}
