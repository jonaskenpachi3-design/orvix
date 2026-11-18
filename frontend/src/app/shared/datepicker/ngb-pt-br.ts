import { Injectable } from '@angular/core';
import { NgbDateParserFormatter, NgbDatepickerI18n, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_FULL = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Campo de data digitado/exibido como DD/MM/AAAA (o padrão do ng-bootstrap é AAAA-MM-DD). */
@Injectable()
export class NgbDateParserFormatterPtBr extends NgbDateParserFormatter {
  parse(value: string): NgbDateStruct | null {
    const text = (value ?? '').trim();
    if (!text) return null;

    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    if (!match) {
      // Texto inválido: retorna data inexistente para o campo ficar marcado como inválido
      return { year: NaN, month: NaN, day: NaN };
    }

    return { day: Number(match[1]), month: Number(match[2]), year: Number(match[3]) };
  }

  format(date: NgbDateStruct | null): string {
    if (!date || !Number.isFinite(date.year) || !Number.isFinite(date.month) || !Number.isFinite(date.day)) {
      return '';
    }
    return `${pad(date.day)}/${pad(date.month)}/${date.year}`;
  }
}

/** Calendário em português (dias e meses). */
@Injectable()
export class NgbDatepickerI18nPtBr extends NgbDatepickerI18n {
  getWeekdayLabel(weekday: number): string {
    return WEEKDAYS[weekday - 1];
  }

  getMonthShortName(month: number): string {
    return MONTHS_SHORT[month - 1];
  }

  getMonthFullName(month: number): string {
    return MONTHS_FULL[month - 1];
  }

  getDayAriaLabel(date: NgbDateStruct): string {
    return `${pad(date.day)} de ${MONTHS_FULL[date.month - 1]} de ${date.year}`;
  }
}
