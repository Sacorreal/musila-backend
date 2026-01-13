import { Injectable } from '@nestjs/common';
import ISO6391 from 'iso-639-1';

export interface LanguageOption {
  code: string;
  label: string;
}

@Injectable()
export class LanguagesService {
  getAllLanguages(): LanguageOption[] {
    return ISO6391.getAllCodes()
      .map((code) => ({
        code,
        label: ISO6391.getNativeName(code),
      }))
      .filter((lang) => lang.label)
      .sort((a, b) =>
        a.label.localeCompare(b.label, 'es', {
          sensitivity: 'base',
        }),
      );
  }
}
