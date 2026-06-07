import EventBus from './helpers/EventBus';
import StringArt, { Pattern } from './infra/StringArt';
import { AppData, PatternData } from './types/persistance.types';
import type InputDialog from './components/dialogs/InputDialog';
import { confirm, prompt } from './helpers/dialogs';
import { getQueryParams } from './helpers/url_utils';
import { ID } from './types/stringart.types';
import { downloadFile, DownloadPatternOptions } from './download/Download';
import { createPatternInstance } from './helpers/pattern_utils';
import { DownloadInstructionsOptions } from './components/dialogs/download_instructions/download_instructions_types';
import i18n from './i18n';

const APP_DATA_STORAGE_KEY = 'string_art_app_data';

export default class Persistance extends EventBus<{
  newPattern: { pattern: StringArt<any> };
  deletePattern: { pattern: StringArt<any> };
  save: { pattern: StringArt<any> };
}> {
  elements: {
    saveDialog: InputDialog;
  };

  currentPattern: StringArt<any>;

  constructor() {
    super();

    this.elements = {
      saveDialog: document.querySelector('#save_dialog'),
    };

    document.querySelector('#save_btn').addEventListener('click', () => {
      if (this.currentPattern.isTemplate) {
        this.showSaveAsDialog();
      } else {
        this.saveCurrentPattern();
      }
    });
  }

  showSaveAsDialog() {
    const nextId = this.#getNextAvailableId();
    const defaultName = getQueryParams().name ?? `Pattern #${nextId}`;

    prompt({
      title: i18n.t('pers_save_pattern'),
      description: i18n.t('pers_name_pattern'),
      submit: i18n.t('pers_save'),
      value: defaultName,
      dialogId: 'save_as',
    }).then(
      patternName => {
        this.saveNewPattern({
          type: this.currentPattern.type,
          config: this.currentPattern.config,
          name:
            patternName == null || patternName === ''
              ? defaultName
              : patternName,
        });
      },
      () => {}
    );
  }

  setPattern(pattern: StringArt<any>) {
    this.currentPattern = pattern;
  }

  static patternDataToStringArt({
    type,
    ...patternData
  }: PatternData): StringArt<any> {
    const pattern = createPatternInstance(type);
    Object.assign(pattern, patternData);
    pattern.markConfigAsDefault();

    return pattern;
  }

  static getSavedPatterns(): StringArt<any>[] {
    const { patterns } = this.loadAppData();
    return patterns.map(this.patternDataToStringArt);
  }

  static getPatternByID(patternId: string): StringArt<any> | null {
    const patternData = this.loadPatternDataById(patternId);
    return patternData ? this.patternDataToStringArt(patternData) : null;
  }

  static loadPatternDataById(patternId: string): PatternData | null {
    const { patterns } = this.loadAppData();
    return patterns.find(({ id }) => id === patternId);
  }

  #getNextAvailableId(): string {
    const appData = Persistance.loadAppData();
    const lastId = appData?.patterns?.length
      ? Number(appData.patterns[appData.patterns.length - 1].id)
      : 0;
    const nextId = isNaN(lastId) ? 1 : lastId + 1;
    return String(nextId);
  }

  #getUniquePatternName(name: string, excludeId?: string): string {
    const savedPatterns = Persistance.getSavedPatterns();
    let uniqueName = name;
    let counter = 1;
    while (
      savedPatterns.some(
        p => p.name.toLowerCase() === uniqueName.toLowerCase() && p.id !== excludeId
      )
    ) {
      uniqueName = `${name} (${counter})`;
      counter++;
    }
    return uniqueName;
  }

  saveNewPattern(patternData: Omit<PatternData, 'id'>): PatternData {
    const appData = Persistance.loadAppData();
    const nextId = this.#getNextAvailableId();
    const uniqueName = this.#getUniquePatternName(patternData.name);

    const newPatternData: PatternData = {
      ...patternData,
      name: uniqueName,
      id: nextId,
    };

    appData.patterns.push(newPatternData);
    Persistance.saveAppData(appData);

    this.emit('newPattern', {
      pattern: Persistance.patternDataToStringArt(newPatternData),
    });

    this.showToast(i18n.t('pers_pattern_saved'));

    return newPatternData;
  }

  savePattern(patternData: PatternData) {
    const appData = Persistance.loadAppData();

    const patternIndex = appData.patterns.findIndex(
      ({ id }) => id === this.currentPattern.id
    );
    if (patternIndex !== -1) {
      appData.patterns[patternIndex] = patternData;
      Persistance.saveAppData(appData);

      this.emit('save', {
        pattern: Persistance.patternDataToStringArt(patternData),
      });

      this.showToast(i18n.t('pers_pattern_saved'));
    }
  }

  saveCurrentPattern() {
    const newPatternData: PatternData = {
      id: this.currentPattern.id,
      name: this.currentPattern.name,
      type: this.currentPattern.type,
      config: this.currentPattern.config,
    };

    this.savePattern(newPatternData);
    return newPatternData;
  }

  showToast(message: string) {
    const toast = document.createElement('div');
    toast.className = 'toast_notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger layout
    toast.getBoundingClientRect();
    
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  }

  renameCurrentPattern() {
    prompt({
      title: i18n.t('pers_rename'),
      description: i18n.t('pers_name_pattern'),
      submit: i18n.t('pers_save'),
      value: this.currentPattern.name,
      dialogId: 'rename',
    }).then(newPatternName => {
      if (newPatternName !== this.currentPattern.name) {
        const uniqueName = this.#getUniquePatternName(newPatternName, this.currentPattern.id);
        const patternData = Persistance.loadPatternDataById(
          this.currentPattern.id
        );
        patternData.name = uniqueName;
        this.savePattern(patternData);
        this.currentPattern.name = uniqueName;
      }
    });
  }

  deletePattern() {
    confirm({
      title: i18n.t('pers_delete_pattern'),
      description: i18n.t('pers_delete_confirm'),
      submit: i18n.t('pers_delete'),
      type: 'error',
      dialogId: 'delete',
    }).then(
      () => {
        const appData = Persistance.loadAppData();
        const patternIndex = appData.patterns.findIndex(
          ({ id }) => id === this.currentPattern.id
        );
        if (patternIndex === -1) {
          throw new Error(
            `Can't delete pattern with ID "${this.currentPattern.id}", it's not found!`
          );
        }

        const patternData = appData.patterns.splice(patternIndex, 1)[0];
        Persistance.saveAppData(appData);

        const pattern = Persistance.patternDataToStringArt(patternData);
        pattern.resetDefaultConfig();

        this.emit('deletePattern', {
          pattern,
        });
      },
      () => {}
    );
  }

  exportAllPatterns() {
    const data = Persistance.loadAppData();
    // Create a Blob with the JSON string and specify the MIME type
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    downloadFile({ data: blob, filename: 'String Art Studio patterns.json' });
  }

  importPatterns({ patterns }: AppData) {
    if (!patterns) {
      throw new Error('Data does not include patterns.');
    }

    patterns.forEach(({ id, ...patternData }) =>
      this.saveNewPattern(patternData)
    );
  }

  static savePatternDownloadData(patternId: ID, data: DownloadPatternOptions) {
    const appData = Persistance.loadAppData();
    if (!appData.downloadData) {
      appData.downloadData = {};
    }
    appData.downloadData[patternId] = data;
    this.saveAppData(appData);
  }

  static savePatternDownloadInstructionsData(
    patternId: ID,
    data: DownloadInstructionsOptions
  ) {
    const appData = Persistance.loadAppData();
    if (!appData.downloadInstructionsData) {
      appData.downloadInstructionsData = {};
    }
    appData.downloadInstructionsData[patternId] = data;
    this.saveAppData(appData);
  }

  static getPatternDownloadData(patternId: ID): DownloadPatternOptions | null {
    const appData = Persistance.loadAppData();
    return appData.downloadData?.[patternId];
  }

  static getPatternDownloadInstructionsData(
    patternId: ID
  ): DownloadInstructionsOptions | null {
    const appData = Persistance.loadAppData();
    return appData.downloadInstructionsData?.[patternId];
  }

  static loadAppData(): AppData {
    const rawData = localStorage.getItem(APP_DATA_STORAGE_KEY);
    try {
      return rawData
        ? JSON.parse(rawData)
        : { patterns: [], downloadData: {}, downloadInstructionsData: {} };
    } catch (error) {
      throw new Error(
        'App data is corrupted, failed to load it. ' + error.message
      );
    }
  }

  static saveAppData(appData: AppData): void {
    localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(appData));
  }
}
