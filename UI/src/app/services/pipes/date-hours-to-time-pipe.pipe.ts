import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateHoursToTimePipe',
  standalone: true
})
export class DateHoursToTimePipePipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '00:00:00';

    const parts = value.split(':');

    const seconds = parts[2].split('.')[0];

    return `${parts[0]}:${parts[1]}:${seconds}`;
  }
}
