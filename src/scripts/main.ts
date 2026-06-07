import Player from './editor/Player';
import EditorControls, {
  ControlValueChangeEventData,
} from './editor/EditorControls';
import { Thumbnails } from './thumbnails/Thumbnails';
import { isShareSupported, share } from './share';
import { initServiceWorker } from './pwa';
import SVGRenderer from './infra/renderers/SVGRenderer';
import CanvasRenderer from './infra/renderers/CanvasRenderer';
import './components/components';
import Persistance from './Persistance';
import StringArt from './infra/StringArt';
import { confirm } from './helpers/dialogs';
import Viewer from './viewer/Viewer';
import type DownloadDialog from './components/dialogs/download_dialog/DownloadDialog';
import { findPatternById, getAllPatternsTypes } from './helpers/pattern_utils';
import routing from './routing';
import { hide, unHide } from './helpers/dom_utils';
import info from './Info';
import i18n, { 
  Locale, 
  LocaleWithSystem, 
  LOCALES, 
  LOCALES_WITH_SYSTEM, 
  LOCALE_DISPLAY_NAMES, 
  LOCALE_DISPLAY_NAMES_WITH_SYSTEM 
} from './i18n';
import 'scheduler-polyfill';
import posthog from 'posthog-js';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { DropdownMenu } from './components/DropdownMenu';
import { getCurrentFolder } from './helpers/url_utils';
import { createPatternInstructions } from './download/download_instructions';
import { Dimensions } from './types/general.types';
import DownloadInstructionsDialog from './components/dialogs/download_instructions/DownloadInstructionsDialog';

export const LOCALE_FLAGS: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  pt: '🇧🇷',
  fr: '🇫🇷',
  ja: '🇯🇵',
  ko: '🇰🇷',
  ru: '🇷🇺',
  it: '🇮🇹',
  de: '🇩🇪',
  zh: '🇨🇳',
};

// Shared state for the legal dialog — tracked at module scope so
// applyTranslations() (defined inside main()) can update it.
let __legalData: any = null;
let __currentLegalType: 'terms' | 'privacy' | 'license' | 'help' | null = null;
let __openLegalDialog: (type: 'terms' | 'privacy' | 'license' | 'help') => void = () => {};

window.addEventListener('error', function (event) {
  alert('Error:\n' + event.message + '\n\nStack:\n' + event.error.stack);
  posthog.captureException(event);
});

/**
 * Helper to translate a free-form string. Used by share.ts via window.
 */
function tr(key: string, vars?: Record<string, string | number>): string {
  return i18n.t(key, vars);
}
(window as any).tr = tr;
// Expose i18n on window so the StringArt.displayName getter can use it
// without importing the i18n module (which would create a cycle since
// pattern classes are imported transitively by main.ts).
(window as any).i18n = i18n;

window.addEventListener('load', main);

async function main() {
  const elements = {
    main: document.querySelector('main'),
    resetBtn: document.querySelector('#controls_reset_btn'),
    buttons: document.querySelector('#buttons'),
    instructionsLink: document.querySelector(
      '#pattern_select_dropdown_instructions'
    ),
  };

  posthog.init('phc_hYSU225vNE9x5Xz1f9YBYf89Gzzqo0GAdXuMiu0NQII', {
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'always',
    persistence: 'localStorage',
  });

  const persistance = new Persistance();
  const thumbnails = new Thumbnails(persistance);
  (window as any).thumbnailsInstance = thumbnails;

  let controls: EditorControls<any>;

  let currentPattern: Pattern;
  let showInfo = false;

  const viewer = (window['viewer'] = new Viewer());
  const player = new Player(document.querySelector('#instructions'), viewer);

  await initServiceWorker();

  // Surface a visible toast whenever a download finishes. Android WebViews
  // don't show any download UI on their own — without this, the user
  // taps "Download" and nothing happens visibly.
  window.addEventListener('stringart:download-toast', (e: Event) => {
    const detail = (e as CustomEvent).detail as { message: string };
    showDownloadToast(detail?.message ?? 'Descarga completada');
  });

  // Initialize theme
  const themeToggleBtns = [
    document.getElementById('theme_toggle_btn'),
    document.getElementById('main_theme_toggle_btn')
  ].filter(Boolean) as HTMLButtonElement[];

  const themeIconsLight = [
    document.getElementById('theme_icon_light'),
    document.getElementById('main_theme_icon_light')
  ].filter(Boolean) as HTMLElement[];

  const themeIconsDark = [
    document.getElementById('theme_icon_dark'),
    document.getElementById('main_theme_icon_dark')
  ].filter(Boolean) as HTMLElement[];
  
  const applyThemeSetting = (setting: 'light' | 'dark' | 'system') => {
    let activeTheme: 'light' | 'dark' = 'dark';
    if (setting === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      activeTheme = systemPrefersDark ? 'dark' : 'light';
    } else {
      activeTheme = setting;
    }
    
    if (activeTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      themeIconsLight.forEach(icon => icon.style.display = 'inline-block');
      themeIconsDark.forEach(icon => icon.style.display = 'none');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeIconsLight.forEach(icon => icon.style.display = 'none');
      themeIconsDark.forEach(icon => icon.style.display = 'inline-block');
    }
    
    localStorage.setItem('app_theme_setting', setting);
    localStorage.setItem('app_theme', activeTheme); // Fallback for components reading 'app_theme'
    
    // Update segmented control active classes
    const optionButtons = {
      light: document.getElementById('theme_btn_light'),
      dark: document.getElementById('theme_btn_dark'),
      system: document.getElementById('theme_btn_system')
    };
    Object.entries(optionButtons).forEach(([key, btn]) => {
      if (btn) {
        if (key === setting) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });
    
    if (viewer.pattern && viewer.renderer) {
      viewer.pattern.draw(viewer.renderer, { redrawNails: true, redrawStrings: false });
    }
  };

  const savedThemeSetting = (localStorage.getItem('app_theme_setting') || 'system') as 'light' | 'dark' | 'system';
  applyThemeSetting(savedThemeSetting);

  // Listen to system media changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentSetting = localStorage.getItem('app_theme_setting') || 'system';
    if (currentSetting === 'system') {
      applyThemeSetting('system');
    }
  });

  // Theme quick-toggle button clicks (switches between light and dark)
  themeToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      applyThemeSetting(isLight ? 'dark' : 'light');
    });
  });

  // Settings dialog controls and handlers
  const settingsBtn = document.getElementById('settings_btn');
  const mainSettingsBtn = document.getElementById('main_settings_btn');
  const settingsDialog = document.getElementById('settings_dialog') as HTMLDialogElement;

  if (settingsDialog) {
    const openSettings = () => {
      const currentSetting = (localStorage.getItem('app_theme_setting') || 'system') as 'light' | 'dark' | 'system';
      applyThemeSetting(currentSetting);
      settingsDialog.showModal();
      routing.navigateToDialog('settings');
    };
    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
    if (mainSettingsBtn) mainSettingsBtn.addEventListener('click', openSettings);
    // Sync the native <dialog>.close() with routing history (the X button,
    // ESC key, and backdrop click all fire the 'close' event).
    settingsDialog.addEventListener('close', () => {
      if (routing.getCurrentDialog?.() === 'settings') {
        routing.closeDialog(false);
      }
    });
  }

  // Segmented control buttons in settings dialog
  ['light', 'dark', 'system'].forEach(val => {
    const btn = document.getElementById(`theme_btn_${val}`);
    if (btn) {
      btn.addEventListener('click', () => {
        applyThemeSetting(val as 'light' | 'dark' | 'system');
      });
    }
  });

  // Premium actions
  const restoreBtn = document.getElementById('restore_purchases_btn');
  if (restoreBtn) {
    restoreBtn.addEventListener('click', () => {
      alert(i18n.t('premium_restored'));
    });
  }

  const rateBtn = document.getElementById('rate_app_btn');
  if (rateBtn) {
    rateBtn.addEventListener('click', () => {
      alert(i18n.t('premium_thanks_rating'));
    });
  }

  // Language selector — opens modal dialog
  const languageDialog = document.getElementById('language_dialog') as HTMLDialogElement;
  const languageBtn = document.getElementById('lang_select_btn') as HTMLElement;
  const languageContent = document.getElementById('language_dialog_content') as HTMLElement;

  const updateLanguageButton = (locale: LocaleWithSystem) => {
    if (languageBtn) {
      const flag = locale === 'system' ? '🌐' : (LOCALE_FLAGS[locale as Locale] || '🌐');
      const label = LOCALE_DISPLAY_NAMES_WITH_SYSTEM[locale];
      languageBtn.innerHTML = `<span class="lang_select_flag">${flag}</span><span class="lang_select_label">${label}</span><i class="icon-caret_down lang_select_arrow" aria-hidden="true"></i>`;
    }
  };

  function openLanguageDialog() {
    if (!languageDialog || !languageContent) return;

    // Translate hero elements before showing dialog
    const heroTitle = languageDialog.querySelector('[data-i18n="language_hero_title"]');
    const heroSubtitle = languageDialog.querySelector('[data-i18n="language_hero_subtitle"]');
    if (heroTitle) i18n.translateElement(heroTitle as HTMLElement);
    if (heroSubtitle) i18n.translateElement(heroSubtitle as HTMLElement);

    languageContent.innerHTML = LOCALES_WITH_SYSTEM
      .map(loc => {
        const flag = loc === 'system' ? '🌐' : LOCALE_FLAGS[loc as Locale] || '🌐';
        const isSelected = loc === i18n.getLocale() ? ' selected' : '';
        return `<button type="button" class="language_item${isSelected}" data-locale="${loc}"><span class="language_item_flag">${flag}</span><span class="language_item_label">${LOCALE_DISPLAY_NAMES_WITH_SYSTEM[loc]}</span></button>`;
      })
      .join('');

    languageDialog.showModal();
      routing.navigateToDialog('language');
  }

  function closeLanguageDialog() {
    languageDialog?.close();
  }

  if (languageBtn) {
    languageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openLanguageDialog();
    });
  }

  const languageBackBtn = document.querySelector('.language_back_btn') as HTMLButtonElement;
  if (languageBackBtn) {
    languageBackBtn.addEventListener('click', closeLanguageDialog);
  }

  if (languageContent) {
    languageContent.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('.language_item') as HTMLElement;
      if (item) {
        const selectedLang = item.dataset.locale as LocaleWithSystem;
        i18n.setLocale(selectedLang);
        updateLanguageButton(selectedLang);
        closeLanguageDialog();
      }
    });
  }

  if (languageDialog) {
    // Sync the native <dialog>.close() (backdrop, ESC, X, back btn) with
    // routing history so the Android back gesture closes the dialog.
    languageDialog.addEventListener('close', () => {
      if (routing.getCurrentDialog?.() === 'language') {
        routing.closeDialog(false);
      }
    });
    languageDialog.addEventListener('click', (e) => {
      const rect = languageDialog.getBoundingClientRect();
      const isInDialog = rect.top <= e.clientY && e.clientY <= rect.bottom && rect.left <= e.clientX && e.clientX <= rect.right;
      if (!isInDialog) closeLanguageDialog();
    });
  }

  updateLanguageButton(i18n.getLocale());

  i18n.addEventListener('change', (newLocale: LocaleWithSystem) => {
    updateLanguageButton(newLocale);
    i18n.translateElement(document);
  });

  /**
   * Apply translations to the static DOM (data-i18n attrs). Called once on
   * load and from the i18n 'change' listener. Mutates global legalData when
   * defined (see the Legal & Help section further below).
   */
  function applyTranslations() {
    document.documentElement.lang = i18n.getLocale();
    i18n.translateElement(document);
  }  applyTranslations();
  document.body.querySelectorAll('.pattern_only').forEach(hide);

  type Pattern = StringArt<any>;

  const showShare = await isShareSupported();
  if (!showShare) {
    document.querySelector('#share_menu_item').remove();
  }

  const downloadDialog = document.querySelector(
    '#download_dialog'
  ) as DownloadDialog;

  const downloadInstructionsDialog = document.querySelector(
    '#download_instructions_dialog'
  ) as DownloadInstructionsDialog;

  // =========================================================================
  // Android hardware back button (only registered in the native Android
  // wrapper — the WebView in the browser handles its own URL-history back).
  // Hierarchy:
  //   1) Close any open native <dialog> (settings, saved_patterns, legal,
  //      download, download_instructions).
  //   2) Close the design bottom-sheet overlay if it's open.
  //   3) If a pattern is selected, navigate back to the landing gallery.
  //   4) Otherwise (we're on the landing) — exit the app.
  // =========================================================================
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    App.addListener('backButton', () => {
      // 1) Close any open native <dialog>. The 'close' event listener
      //    registered for each dialog will sync the routing state.
      const nativeDialogs: (HTMLDialogElement | null)[] = [
        settingsDialog,
        document.getElementById('saved_patterns_dialog') as HTMLDialogElement | null,
        legalDialog,
        document.getElementById('download_dialog') as HTMLDialogElement | null,
        document.getElementById('download_instructions_dialog') as HTMLDialogElement | null,
        document.getElementById('language_dialog') as HTMLDialogElement | null,
      ];
      const openDialog = nativeDialogs.find(d => d?.open);
      if (openDialog) {
        openDialog.close();
        return;
      }

      // 2) Close the design overlay (mobile bottom sheet)
      const designEl = document.getElementById('design');
      if (document.body.classList.contains('dialog_design') &&
          designEl?.classList.contains('open')) {
        designEl.classList.remove('open');
        document.body.classList.remove('dialog_design');
        if (history.state?.overlayId === 'design') {
          history.back();
        }
        return;
      }

      // 3) If a pattern is selected, navigate back to the landing
      if (document.body.hasAttribute('data-pattern')) {
        routing.navigateToMain();
        return;
      }

      // 4) Otherwise (we're on the landing) — exit the app
      App.exitApp();
    });
  }

  // TODO: Return true/false whether the action should be added to the URL.
  // When URL changes, close an open dialog
  const menuActions = {
    save_as: () => persistance.showSaveAsDialog(),
    delete: () => persistance.deletePattern(),
    save: () => persistance.saveCurrentPattern(),
    rename: () => persistance.renameCurrentPattern(),
    export: () => persistance.exportAllPatterns(),
    reset: () => reset(),
    download: () => {
      routing.navigateToDialog('download');
    },
    instructions: () => showPanel('instructions'),
    design: () => showPanel('design'),
    info: () => showPanel('info'),
    share: () => sharePattern(),
    download_instructions: () => {
      routing.navigateToDialog('download_instructions');
    },
  };

  const dialogs = {
    download: () => {
      downloadDialog!.show(viewer.pattern).finally(() => routing.closeDialog());
    },
    download_instructions: () => {
      downloadInstructionsDialog!
        .show(viewer.pattern)
        .finally(() => routing.closeDialog());
    },
  };

  routing.addEventListener('dialog', dialogId => {
    if (dialogId in dialogs) {
      dialogs[dialogId]();
    } else if (dialogId in menuActions) {
      menuActions[dialogId]();
    } else if (dialogId === 'settings' && settingsDialog?.open) {
      // Already open via direct call from openSettings(); no-op.
    } else if (dialogId === 'saved_patterns' &&
        (document.getElementById('saved_patterns_dialog') as HTMLDialogElement)?.open) {
      // Already open via direct call; no-op.
    } else if (dialogId?.startsWith('legal_') &&
        (document.getElementById('legal_dialog') as HTMLDialogElement)?.open) {
      // Already open via direct call to openLegalDialog(); no-op.
    }
  });

  // When routing says a dialog closed (e.g. user hit history.back from
  // the Android back button), close the native <dialog> element. This
  // keeps the DOM in sync with the URL state.
  routing.addEventListener('dialogClosed', dialogId => {
    if (dialogId === 'settings' && settingsDialog?.open) {
      settingsDialog.close();
    } else if (dialogId === 'saved_patterns') {
      const d = document.getElementById('saved_patterns_dialog') as HTMLDialogElement | null;
      d?.close();
    } else if (dialogId?.startsWith('legal_')) {
      const d = document.getElementById('legal_dialog') as HTMLDialogElement | null;
      d?.close();
    }
  });

  routing.addEventListener('dialogClosed', () => {
    downloadDialog.close();
    downloadInstructionsDialog.close();
  });

  document.getElementById('download_header_btn')?.addEventListener('click', () => {
    routing.navigateToDialog('download');
  });

  (document.querySelector('#pattern_menu') as DropdownMenu)!.addEventListener(
    'select',
    (e: CustomEvent) => {
      const menuItemValue = e.detail.value as keyof typeof menuActions;
      const itemElement = document.querySelector(
        `dropdown-menu-item[value="${menuItemValue}"]`
      );

      if (itemElement?.hasAttribute('selectable')) {
        document
          .querySelector('#pattern_menu [selected]')
          ?.removeAttribute('selected');

        itemElement.setAttribute('selected', 'selected');
      }

      const action = menuActions[menuItemValue];
      if (action) {
        action();
        posthog.capture('pattern_menu_select', {
          menu_item: menuItemValue,
        });
      } else {
        throw new Error(
          `No action available for menu item "${menuItemValue}".`
        );
      }
    }
  );

  document.body.addEventListener('click', e => {
    const toggleBtn =
      e.target instanceof HTMLElement && e.target.closest('[data-toggle-for]');
    if (toggleBtn instanceof HTMLElement && toggleBtn) {
      const dialogId = toggleBtn.dataset.toggleFor;

      toggleBtn.classList.toggle('active');

      const toggledElement = document.querySelector('#' + dialogId);
      if (toggledElement) {
        toggledElement.classList.toggle('open');
        document.body.classList.toggle('dialog_' + dialogId);

        const isOpen = toggledElement.classList.contains('open');

        // History API integration for navigation Back button
        if (dialogId === 'pattern_select_dropdown') {
          if (isOpen) {
             history.pushState({ ...history.state, overlayId: dialogId }, '');
          } else if (history.state?.overlayId === dialogId) {
             history.back();
          }
        }
      }
    }

    // Toggle design panel on mobile when clicking the handle or label
    const designPanel = document.querySelector('#design');
    if (designPanel && window.innerWidth <= 800) {
      // Check if click is on the tab area (handle + label area = first 60px)
      const rect = designPanel.getBoundingClientRect();
      const clickY = e.clientY - rect.top;

      if (clickY >= 0 && clickY < 60 && !e.target.closest('#controls_panel')) {
        e.preventDefault();
        designPanel.classList.toggle('open');
        document.body.classList.toggle('dialog_design');
        
        const isDesignOpen = designPanel.classList.contains('open');
        if (isDesignOpen) {
          history.pushState({ ...history.state, overlayId: 'design' }, '');
        } else if (history.state?.overlayId === 'design') {
          history.back();
        }
        
        // Do NOT trigger resize - preserve canvas size
      }
    }
  });

  // Swipe to open/close design panel on mobile
  const designPanelMobile = document.querySelector('#design') as HTMLElement;
  if (designPanelMobile) {
    let touchStartY = 0;
    
    designPanelMobile.addEventListener('touchstart', (e) => {
      if (window.innerWidth > 800) return;
      const rect = designPanelMobile.getBoundingClientRect();
      const touchY = e.touches[0].clientY - rect.top;
      
      // Bind swipe only when touched the upper handle area (first 60px)
      if (touchY >= 0 && touchY < 60) {
        touchStartY = e.touches[0].clientY;
      } else {
        touchStartY = 0;
      }
    }, { passive: true });

    designPanelMobile.addEventListener('touchend', (e) => {
      if (!touchStartY || window.innerWidth > 800) return;
      
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchEndY - touchStartY;
      
      if (Math.abs(deltaY) > 30) { // Require at least 30px movement to trigger swipe
        const isDesignOpen = designPanelMobile.classList.contains('open');
        
        if (deltaY > 0 && isDesignOpen) { // Swipe DOWN
          designPanelMobile.classList.remove('open');
          document.body.classList.remove('dialog_design');
          if (history.state?.overlayId === 'design') {
            history.back();
          }
        } else if (deltaY < 0 && !isDesignOpen) { // Swipe UP
          designPanelMobile.classList.add('open');
          document.body.classList.add('dialog_design');
          history.pushState({ ...history.state, overlayId: 'design' }, '');
        }
      }
      touchStartY = 0;
    });
  }

  elements.resetBtn.addEventListener('click', reset);

  async function sharePattern() {
    await share({
      renderer: viewer.renderer,
      pattern: viewer.pattern,
    });
  }

  elements.instructionsLink?.addEventListener('click', e => {
    e.preventDefault();
    routing.navigateToMain();
  });

  thumbnails.addEventListener('select', ({ patternId }) => {
    const pattern = findPatternById(patternId);
    
    // Erase overlay state ghost frames by functionally replacing them when navigating
    const shouldReplace = !!history.state?.overlayId;
    routing.navigateToPattern(pattern, { replaceState: shouldReplace });
    
    posthog.capture('thumbnail_select', {
      pattern: pattern.type,
      isTemplate: pattern.isTemplate,
    });

    // Cleanup lingering body locks that popup navigation usually clears
    document.body.classList.remove('dialog_pattern_select_dropdown');
    document.querySelector('[data-toggle-for="pattern_select_dropdown"]')?.classList.remove('active');
  });

  const PANELS = ['info', 'design', 'instructions'];

  function showPanel(panelId: string, navigateToFolder = true) {
    PANELS.forEach(panel => {
      if (panel !== panelId) {
        document.querySelector('#' + panel).classList.remove('open');
        document
          .querySelector(`dropdown-menu-item[value='${panel}']`)
          ?.removeAttribute('selected');
        document.body.classList.remove('dialog_' + panel);
      }
    });

    document
      .querySelector(`dropdown-menu-item[value='${panelId}']`)
      ?.setAttribute('selected', 'selected');

    const toggledElement = document.querySelector('#' + panelId);
    if (toggledElement && !toggledElement.classList.contains('open')) {
      toggledElement.classList.add('open');
      document.body.classList.add('dialog_' + panelId);
      currentPattern && viewer.update();
    }

    if (panelId === 'info') {
      showInfo = !showInfo;

      if (showInfo) {
        info.setPattern(currentPattern, viewer.size);
      }
    }

    if (navigateToFolder) {
      routing.navigateToFolder(panelId);
    }
  }

  routing.addEventListener('folder', folder => showPanel(folder, false));

  persistance.addEventListener('deletePattern', ({ pattern }) => {
    const templatePattern = findPatternById(pattern.type);
    if (templatePattern) {
      templatePattern.config = pattern.config;
      routing.navigateToPattern(templatePattern);
    }
  });

  persistance.addEventListener('save', ({ pattern }) => {
    routing.navigateToPattern(pattern);
  });

  persistance.addEventListener('newPattern', ({ pattern }) => {
    posthog.capture('save_new_pattern', {
      pattern: pattern.type,
      config: JSON.stringify(pattern.config),
    });
  });

  unHide(document.querySelector('main'));
  initRouting();
  initLandingGallery();

  function initLandingGallery() {
    const container = document.getElementById('landing_patterns_container');
    const backBtn = document.getElementById('back_to_gallery_btn');

    if (!container) return;

    // Use the Thumbnails instance — it already knows how to render pattern cards
    (window as any).thumbnailsInstance.renderLandingGallery(container);

    // Back button — return to landing gallery
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        routing.navigateToMain();
      });
    }

    // Saved patterns dialog button hook
    const savedPatternsBtn = document.getElementById('saved_patterns_btn');
    const savedPatternsDialog = document.getElementById('saved_patterns_dialog') as HTMLDialogElement;
    const savedPatternsContainer = document.getElementById('saved_patterns_container');

    if (savedPatternsBtn && savedPatternsDialog && savedPatternsContainer) {
      savedPatternsBtn.addEventListener('click', () => {
        (window as any).thumbnailsInstance.renderSavedPatterns(savedPatternsContainer);
        savedPatternsDialog.showModal();
        routing.navigateToDialog('saved_patterns');
      });
      // Sync the native <dialog>.close() (X, ESC, backdrop) with routing.
      savedPatternsDialog.addEventListener('close', () => {
        if (routing.getCurrentDialog?.() === 'saved_patterns') {
          routing.closeDialog(false);
        }
      });
    }

    // Update back button visibility based on pattern state
    if (backBtn) {
      const updateBackBtn = () => {
        backBtn.hidden = !document.body.hasAttribute('data-pattern');
      };

      routing.addEventListener('pattern', updateBackBtn);
      routing.addEventListener('main', updateBackBtn);
      updateBackBtn();
    }
  }

  function initRouting() {
    setTimeout(() => {
      const currentPanel = getCurrentFolder();
      if (currentPanel) {
        showPanel(currentPanel);
      }
    });
    routing.addEventListener('pattern', ({ pattern, renderer }) => {
      selectPattern(pattern);
      viewer.setPattern(pattern);
      thumbnails.close();
    });

    routing.addEventListener('main', () => {
      thumbnails.open();
      unselectPattern();
    });

    routing.init();
  }

  function reset() {
    confirm({
      title: i18n.t('reset_title'),
      description: currentPattern.isTemplate
        ? i18n.t('reset_template_desc')
        : i18n.t('reset_saved_desc'),
      submit: i18n.t('reset_submit'),
    }).then(
      () => {
        const pattern = findPatternById(currentPattern.id);
        routing.navigateToPattern(pattern);
      },
      () => {}
    );
  }

  function onInputsChange({ control }: ControlValueChangeEventData<any, any>) {
    if (control.affectsStepCount !== false) {
      player.update(viewer.getStepCount());
    }
    routing.navigateToPattern(currentPattern, {
      renderer: viewer.renderer instanceof SVGRenderer ? 'svg' : undefined,
      replaceState: true,
    });

    setIsDefaultConfig();
    if (showInfo) {
      info.setPattern(currentPattern, viewer.size);
    }
  }

  function setIsDefaultConfig() {
    elements.main.dataset.isDefaultConfig = String(
      currentPattern.isDefaultConfig
    );
  }

  function selectPattern(pattern: Pattern) {
    currentPattern = pattern;

    viewer.setPattern(pattern);
    controls?.destroy();

    persistance.setPattern(currentPattern);
    controls = new EditorControls<any>(pattern.configControls, pattern.config);
    controls.addEventListener('input', ({ control, value }) => {
      if (currentPattern) {
        currentPattern.setConfigValue(control.key, value);
        controls.config = currentPattern.config;
        viewer.update({
          redrawNails: control.affectsNails !== false,
          redrawStrings: control.affectsStrings !== false,
          enableScheduler: true,
        });
      }
    });
    controls.addEventListener('change', onInputsChange);

    thumbnails.setCurrentPattern(pattern);
    document.title = `${pattern.name} - String Art Studio`;
    document.body.setAttribute('data-pattern', pattern.id);

    document.body.querySelectorAll('.pattern_only').forEach(unHide);



    viewer.update();

        player.update(viewer.getStepCount(), { draw: false });
        if (showInfo) {
          info.setPattern(pattern, viewer.size);
        }

        elements.main.dataset.isTemplate = String(currentPattern.isTemplate);
        setIsDefaultConfig();
      }

      function unselectPattern() {
        player.pause();
        currentPattern = null;
        viewer.setPattern(null);
        thumbnails.setCurrentPattern(null);
        controls && controls.destroy();
        document.body.querySelectorAll('.pattern_only').forEach(hide);
        document.body.removeAttribute('data-pattern');
      }

      // --- Legal & Help Dialogs ---
        const legalDialog = document.getElementById('legal_dialog') as HTMLDialogElement;
        const legalTitle = document.getElementById('legal_dialog_title');
        const legalContent = document.getElementById('legal_dialog_content');

        type LegalType = 'terms' | 'privacy' | 'license' | 'help';
        type LegalEntry = {
          topbarTitle: string;
          heroTitle: string;
          heroSubtitle: string;
          heroIcon: string;
          heroColor: 'yellow' | 'lavender' | 'mint' | 'pink';
          content: string;
        };
        type LegalDataMap = Record<LegalType, LegalEntry>;

        function buildLegalData(): LegalDataMap {
          return {
            terms: {
              topbarTitle: i18n.t('terms_topbar'),
              heroTitle: i18n.t('terms_hero'),
              heroSubtitle: i18n.t('legal_subtitle'),
              heroIcon: i18n.t('terms_icon'),
              heroColor: 'lavender',
              content: `
                <p class="legal_last_updated">${i18n.t('terms_last_updated')}</p>

                <div class="legal_section">
                  <div class="legal_section_header legal_section_header--lavender">
                    <span class="legal_section_icon" aria-hidden="true">📋</span>
                    <span class="legal_section_title">${i18n.t('terms_s1_title')}</span>
                  </div>
                  <div class="legal_section_body">
                    <h3 class="legal_question">${i18n.t('terms_s1_q1')}</h3>
                    <p>${i18n.t('terms_s1_a1')}</p>
                    <h3 class="legal_question">${i18n.t('terms_s1_q2')}</h3>
                    <p>${i18n.t('terms_s1_a2')}</p>
                    <h3 class="legal_question">${i18n.t('terms_s1_q3')}</h3>
                    <p>${i18n.t('terms_s1_a3')}</p>
                  </div>
                </div>

                <div class="legal_section">
                  <div class="legal_section_header legal_section_header--yellow">
                    <span class="legal_section_icon" aria-hidden="true">⚠</span>
                    <span class="legal_section_title">${i18n.t('terms_s2_title')}</span>
                  </div>
                  <div class="legal_section_body">
                    <h3 class="legal_question">${i18n.t('terms_s2_q1')}</h3>
                    <p>${i18n.t('terms_s2_a1')}</p>
                    <ol class="legal_numbered_list">
                      <li>${i18n.t('terms_s2_l1')}</li>
                      <li>${i18n.t('terms_s2_l2')}</li>
                      <li>${i18n.t('terms_s2_l3')}</li>
                      <li>${i18n.t('terms_s2_l4')}</li>
                    </ol>
                  </div>
                </div>

                <div class="legal_section">
                  <div class="legal_section_header legal_section_header--pink">
                    <span class="legal_section_icon" aria-hidden="true">⚖</span>
                    <span class="legal_section_title">${i18n.t('terms_s3_title')}</span>
                  </div>
                  <div class="legal_section_body">
                    <h3 class="legal_question">${i18n.t('terms_s3_q1')}</h3>
                    <p>${i18n.t('terms_s3_a1')}</p>
                    <h3 class="legal_question">${i18n.t('terms_s3_q2')}</h3>
                    <p>${i18n.t('terms_s3_a2')}</p>
                    <h3 class="legal_question">${i18n.t('terms_s3_q3')}</h3>
                    <p>${i18n.t('terms_s3_a3')}</p>
                    <h3 class="legal_question">${i18n.t('terms_s3_q4')}</h3>
                    <p>${i18n.t('terms_s3_a4')}</p>
                  </div>
                </div>
              `
            },
            privacy: {
              topbarTitle: i18n.t('privacy_topbar'),
              heroTitle: i18n.t('privacy_hero'),
              heroSubtitle: i18n.t('legal_subtitle'),
              heroIcon: i18n.t('privacy_icon'),
              heroColor: 'mint',
              content: `
                <p class="legal_last_updated">${i18n.t('privacy_last_updated')}</p>

                <div class="legal_section">
                  <div class="legal_section_header legal_section_header--mint">
                    <span class="legal_section_icon" aria-hidden="true">📦</span>
                    <span class="legal_section_title">${i18n.t('privacy_s1_title')}</span>
                  </div>
                  <div class="legal_section_body">
                    <h3 class="legal_question">${i18n.t('privacy_s1_q1')}</h3>
                    <p>${i18n.t('privacy_s1_a1')}</p>
                    <ol class="legal_numbered_list">
                      <li>${i18n.t('privacy_s1_l1')}</li>
                      <li>${i18n.t('privacy_s1_l2')}</li>
                      <li>${i18n.t('privacy_s1_l3')}</li>
                    </ol>
                  </div>
                </div>

                <div class="legal_section">
                  <div class="legal_section_header legal_section_header--yellow">
                    <span class="legal_section_icon" aria-hidden="true">🔒</span>
                    <span class="legal_section_title">${i18n.t('privacy_s2_title')}</span>
                  </div>
                  <div class="legal_section_body">
                    <h3 class="legal_question">${i18n.t('privacy_s2_q1')}</h3>
                    <p>${i18n.t('privacy_s2_a1')}</p>
                    <ol class="legal_numbered_list">
                      <li>${i18n.t('privacy_s2_l1')}</li>
                      <li>${i18n.t('privacy_s2_l2')}</li>
                      <li>${i18n.t('privacy_s2_l3')}</li>
                    </ol>
                    <h3 class="legal_question">${i18n.t('privacy_s2_q2')}</h3>
                    <p>${i18n.t('privacy_s2_a2')}</p>
                    <h3 class="legal_question">${i18n.t('privacy_s2_q3')}</h3>
                    <p>${i18n.t('privacy_s2_a3')}</p>
                  </div>
                </div>

                <div class="legal_section">
                  <div class="legal_section_header legal_section_header--lavender">
                    <span class="legal_section_icon" aria-hidden="true">🛡</span>
                    <span class="legal_section_title">${i18n.t('privacy_s3_title')}</span>
                  </div>
                  <div class="legal_section_body">
                    <h3 class="legal_question">${i18n.t('privacy_s3_q1')}</h3>
                    <p>${i18n.t('privacy_s3_a1')}</p>
                    <h3 class="legal_question">${i18n.t('privacy_s3_q2')}</h3>
                    <p>${i18n.t('privacy_s3_a2')}</p>
                    <h3 class="legal_question">${i18n.t('privacy_s3_q3')}</h3>
                    <p>${i18n.t('privacy_s3_a3')}</p>
                    <ol class="legal_numbered_list">
                      <li>${i18n.t('privacy_s3_l1')}</li>
                      <li>${i18n.t('privacy_s3_l2')}</li>
                      <li>${i18n.t('privacy_s3_l3')}</li>
                    </ol>
                    <h3 class="legal_question">${i18n.t('privacy_s3_q4')}</h3>
                    <p>${i18n.t('privacy_s3_a4')}</p>
                    <h3 class="legal_question">${i18n.t('privacy_s3_q5')}</h3>
                    <p>${i18n.t('privacy_s3_a5')}</p>
                  </div>
                </div>
              `
            },
            license: {
              topbarTitle: i18n.t('license_topbar'),
              heroTitle: i18n.t('license_hero'),
              heroSubtitle: i18n.t('legal_subtitle'),
              heroIcon: i18n.t('license_icon'),
              heroColor: 'pink',
              content: `
                <p class="legal_last_updated">${i18n.t('license_last_updated')}</p>

                <div class="legal_section">
                  <div class="legal_section_header legal_section_header--pink">
                    <span class="legal_section_icon" aria-hidden="true">★</span>
                    <span class="legal_section_title">${i18n.t('license_s1_title')}</span>
                  </div>
                  <div class="legal_section_body">
                    <h3 class="legal_question">${i18n.t('license_s1_q1')}</h3>
                    <p>${i18n.t('license_s1_a1')}</p>
                    <h3 class="legal_question">${i18n.t('license_s1_q2')}</h3>
                    <p>${i18n.t('license_s1_a2')}</p>
                  </div>
                </div>

                <div class="legal_section">
                  <div class="legal_section_header legal_section_header--yellow">
                    <span class="legal_section_icon" aria-hidden="true">📚</span>
                    <span class="legal_section_title">${i18n.t('license_s2_title')}</span>
                  </div>
                  <div class="legal_section_body">
                    <h3 class="legal_question">${i18n.t('license_s2_q1')}</h3>
                    <p>${i18n.t('license_s2_a1')}</p>
                    <ol class="legal_numbered_list">
                      <li>${i18n.t('license_s2_l1')}</li>
                      <li>${i18n.t('license_s2_l2')}</li>
                    </ol>
                    <h3 class="legal_question">${i18n.t('license_s2_q2')}</h3>
                    <p>${i18n.t('license_s2_a2')}</p>
                  </div>
                </div>

                <div class="legal_section">
                  <div class="legal_section_header legal_section_header--lavender">
                    <span class="legal_section_icon" aria-hidden="true">🤝</span>
                    <span class="legal_section_title">${i18n.t('license_s3_title')}</span>
                  </div>
                  <div class="legal_section_body">
                    <h3 class="legal_question">${i18n.t('license_s3_q1')}</h3>
                    <p>${i18n.t('license_s3_a1')}</p>
                    <h3 class="legal_question">${i18n.t('license_s3_q2')}</h3>
                    <p>${i18n.t('license_s3_a2')}</p>
                    <h3 class="legal_question">${i18n.t('license_s3_q3')}</h3>
                    <p>${i18n.t('license_s3_a3')}</p>
                    <h3 class="legal_question">${i18n.t('license_s3_q4')}</h3>
                    <p>${i18n.t('license_s3_a4')}</p>
                  </div>
                </div>
              `
            },
            help: {
              topbarTitle: i18n.t('help_topbar'),
              heroTitle: i18n.t('help_hero'),
              heroSubtitle: i18n.t('legal_subtitle'),
              heroIcon: i18n.t('help_icon'),
              heroColor: 'yellow',
              content: `
                <div class="legal_section">
                  <div class="legal_section_header legal_section_header--lavender">
                    <span class="legal_section_icon" aria-hidden="true">${i18n.t('help_s1_icon')}</span>
                    <span class="legal_section_title">${i18n.t('help_s1_title')}</span>
                  </div>
                  <div class="legal_section_body">
                    <h3 class="legal_question">${i18n.t('help_s1_q1')}</h3>
                    <p>${i18n.t('help_s1_a1')}</p>
                    <ol class="legal_numbered_list">
                      <li>${i18n.t('help_s1_l1')}</li>
                      <li>${i18n.t('help_s1_l2')}</li>
                      <li>${i18n.t('help_s1_l3')}</li>
                      <li>${i18n.t('help_s1_l4')}</li>
                    </ol>
                  </div>
                </div>

                <div class="legal_section">
                  <div class="legal_section_header legal_section_header--yellow">
                    <span class="legal_section_icon" aria-hidden="true">⚙</span>
                    <span class="legal_section_title">${i18n.t('help_s2_title')}</span>
                  </div>
                  <div class="legal_section_body">
                    <h3 class="legal_question">${i18n.t('help_s2_q1')}</h3>
                    <p>${i18n.t('help_s2_a1')}</p>
                    <h3 class="legal_question">${i18n.t('help_s2_q2')}</h3>
                    <p>${i18n.t('help_s2_a2')}</p>
                    <h3 class="legal_question">${i18n.t('help_s2_q3')}</h3>
                    <p>${i18n.t('help_s2_a3')}</p>
                    <h3 class="legal_question">${i18n.t('help_s2_q4')}</h3>
                    <p>${i18n.t('help_s2_a4')}</p>
                    <h3 class="legal_question">${i18n.t('help_s2_q5')}</h3>
                    <p>${i18n.t('help_s2_a5')}</p>
                  </div>
                </div>

                <div class="legal_section">
                  <div class="legal_section_header legal_section_header--mint">
                    <span class="legal_section_icon" aria-hidden="true">🔗</span>
                    <span class="legal_section_title">${i18n.t('help_s3_title')}</span>
                  </div>
                  <div class="legal_section_body">
                    <h3 class="legal_question">${i18n.t('help_s3_q1')}</h3>
                    <p>${i18n.t('help_s3_a1')}</p>
                    <p class="legal_note">${i18n.t('help_s3_note1')}</p>
                    <h3 class="legal_question">${i18n.t('help_s3_q2')}</h3>
                    <p>${i18n.t('help_s3_a2')}</p>
                    <p class="legal_note">${i18n.t('help_s3_note2')}</p>
                  </div>
                </div>

                <div class="legal_section">
                  <div class="legal_section_header legal_section_header--pink">
                    <span class="legal_section_icon" aria-hidden="true">🛠</span>
                    <span class="legal_section_title">${i18n.t('help_s4_title')}</span>
                  </div>
                  <div class="legal_section_body">
                    <div class="legal_trouble_item">
                      <strong>${i18n.t('help_s4_t1_title')}</strong>
                      <p>${i18n.t('help_s4_t1_desc')}</p>
                    </div>
                    <div class="legal_trouble_item">
                      <strong>${i18n.t('help_s4_t2_title')}</strong>
                      <p>${i18n.t('help_s4_t2_desc')}</p>
                    </div>
                    <div class="legal_trouble_item">
                      <strong>${i18n.t('help_s4_t3_title')}</strong>
                      <p>${i18n.t('help_s4_t3_desc')}</p>
                    </div>
                    <div class="legal_trouble_item">
                      <strong>${i18n.t('help_s4_t4_title')}</strong>
                      <p>${i18n.t('help_s4_t4_desc')}</p>
                    </div>
                  </div>
                </div>

                <div class="legal_contact_box">
                  <h4>${i18n.t('help_contact_title')}</h4>
                  <p>${i18n.t('help_contact_q')}</p>
                  <p><a href="mailto:${i18n.t('contact_email')}">${i18n.t('contact_email')}</a></p>
                  <p>${i18n.t('help_contact_response')}</p>
                </div>
              `
            }
          };
        }

      // Footer button handlers
      document.getElementById('btn_terms')?.addEventListener('click', () => openLegalDialog('terms'));
      document.getElementById('btn_privacy')?.addEventListener('click', () => openLegalDialog('privacy'));
      document.getElementById('btn_license')?.addEventListener('click', () => openLegalDialog('license'));
      document.getElementById('btn_help')?.addEventListener('click', () => openLegalDialog('help'));
      document.getElementById('btn_rate')?.addEventListener('click', () => {
        // Rate would open external app store link - placeholder
        alert(i18n.t('rating_thanks'));
      });

      const legalTopbar = document.getElementById('legal_dialog_topbar_title');
      const legalHero = document.getElementById('legal_dialog_hero');
      const legalHeroIcon = legalHero?.querySelector('.legal_hero_icon');
      const legalHeroSubtitle = legalHero?.querySelector('.legal_hero_subtitle');

      // Build the dialog data fresh on every open so changes to the active
      // locale are reflected immediately without needing to invalidate
      // module-scope state.
      function openLegalDialog(type: LegalType) {
        const data = buildLegalData()[type];
        if (legalTitle && legalContent && data) {
          legalTitle.textContent = data.heroTitle;
          legalContent.innerHTML = data.content;
          if (legalTopbar) legalTopbar.textContent = data.topbarTitle;
          if (legalHeroIcon) legalHeroIcon.textContent = data.heroIcon;
          if (legalHeroSubtitle) legalHeroSubtitle.textContent = data.heroSubtitle;
          if (legalHero) {
            legalHero.classList.remove('legal_hero--yellow', 'legal_hero--lavender', 'legal_hero--mint', 'legal_hero--pink');
            if (data.heroColor) legalHero.classList.add(`legal_hero--${data.heroColor}`);
          }
          __currentLegalType = type;
          if (!legalDialog.open) {
            legalDialog?.showModal();
            routing.navigateToDialog('legal_' + type);
          }
        }
      }

      // Close legal dialog when clicking the back button
      legalDialog?.querySelector('.legal_back_btn')?.addEventListener('click', () => {
        legalDialog.close();
      });

      // Sync the native <dialog>.close() (X, ESC, backdrop, back btn) with
      // routing history. The 'close' event fires once, so we can safely
      // call closeDialog(false) here without triggering an extra history.back().
      legalDialog?.addEventListener('close', () => {
        if (routing.getCurrentDialog?.()?.startsWith('legal_')) {
          routing.closeDialog(false);
        }
      });

      // Close legal dialog when clicking backdrop
      legalDialog?.addEventListener('click', (e) => {
        if (e.target === legalDialog) {
          legalDialog.close();
        }
      });
    };

// ---------------------------------------------------------------------------
// Download toast — surfaced after every successful download/save so the
// user gets explicit feedback, especially on Android where the WebView
// doesn't show any native download UI.
// ---------------------------------------------------------------------------
let downloadToastTimer: number | null = null;

function showDownloadToast(message: string) {
  let toast = document.getElementById('download_toast') as HTMLElement | null;
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'download_toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('show');
  // Force reflow so the class re-add restarts the transition
  void toast.offsetWidth;
  toast.classList.add('show');

  if (downloadToastTimer) window.clearTimeout(downloadToastTimer);
  downloadToastTimer = window.setTimeout(() => {
    toast?.classList.remove('show');
  }, 4500);
}