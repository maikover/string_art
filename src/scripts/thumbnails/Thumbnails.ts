import CanvasRenderer from '../infra/renderers/CanvasRenderer';
import type StringArt from '../infra/StringArt';
import Persistance from '../Persistance';
import EventBus from '../helpers/EventBus';
import { getAllPatternsTypes, findPatternById } from '../helpers/pattern_utils';
import routing from '../routing';

const THUMBNAIL_WIDTH_PX = '100px';
const MINIMIZED_CLASS = 'minimized';

export class Thumbnails extends EventBus<{ select: { patternId: string } }> {
  elements: Record<string, HTMLElement | null> = {
    root: document.querySelector('#pattern_select_panel'),
    thumbnails: document.querySelector('#thumbnails'),
    toggleBtn: document.querySelector('#pattern_select_btn'),
    dropdown: document.querySelector('#pattern_select_dropdown'),
    patternName: document.querySelector('#pattern_name'),
  };

  pattern: StringArt<any>;
  thumbnailsRendered = false;
  _onClickOutside: (e: MouseEvent) => void;

  constructor(persistance: Persistance) {
    super();

    this.elements.toggleBtn?.addEventListener('click', () => this.toggle());

    persistance.addEventListener('newPattern', ({ pattern }) => {
      if (this.isOpen) {
        this.createThumbnails();
      } else {
        this.thumbnailsRendered = false;
      }

      this.setCurrentPattern(pattern);
      this.emit('select', { patternId: pattern.id });
    });

    persistance.addEventListener('save', ({ pattern }) => {
      if (this.isOpen) {
        this.createThumbnails();
      } else {
        this.thumbnailsRendered = false;
      }

      this.setCurrentPattern(pattern);
    });

    persistance.addEventListener('deletePattern', ({ pattern }) => {
      if (this.isOpen && this.elements.thumbnails) {
        const thumbnail = this.elements.thumbnails.querySelector(
          `[data-pattern="${pattern.id}"]`
        );
        thumbnail?.remove();
      } else {
        this.thumbnailsRendered = false;
      }
    });

    this.elements.thumbnails?.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();

      const link =
        e.target instanceof HTMLElement &&
        (e.target.closest('[data-pattern]') as HTMLElement);

      if (!link) {
        return false;
      }

      this.emit('select', { patternId: link.dataset.pattern });
    });

    routing.addEventListener('dialog', dialog => {
      if (dialog === 'thumbnails') {
        if (!this.isOpen) {
          this.open();
        }
      } else {
        this.close();
      }
    });

    routing.addEventListener('dialogClosed', dialog => {
      if (dialog === 'thumbnails') {
        this.close();
      }
    });
  }

  get isOpen(): boolean {
    return this.elements.root ? !this.elements.root.classList.contains(MINIMIZED_CLASS) : false;
  }

  toggle() {
    if (!this.elements.root) return;
    if (!this.isOpen) {
      this.open();
      routing.navigateToDialog('thumbnails');
    } else if (this.pattern) {
      this.close();
      routing.closeDialog();
    }
  }

  open() {
    if (!this.elements.root) return;
    if (!this.isOpen) {
      this.elements.root.classList.remove(MINIMIZED_CLASS);
      this.elements.dropdown?.classList.add('open');
      if (!this.thumbnailsRendered) {
        this.createThumbnails();
        this.thumbnailsRendered = true;
      }

      this._onClickOutside = e => {
        if (
          e.target instanceof HTMLElement &&
          !e.target.closest('#pattern_select_panel')
        ) {
          this.toggle();
        }
      };

      document.body.addEventListener('mousedown', this._onClickOutside);
    }
  }

  close() {
    if (!this.elements.root) return;
    if (this.isOpen) {
      this.elements.root.classList.add(MINIMIZED_CLASS);
      this.elements.dropdown?.classList.remove('open');
      document.body.removeEventListener('mousedown', this._onClickOutside);
      this._onClickOutside = null;
      
      // If closed outside of a popstate (e.g. dimmer click) and URL history still claims it's open, revert the URL.
      if (history.state?.overlayId === 'pattern_select_dropdown') {
        history.back();
      }
      
      // Cleanup lingering explicit body classes tied to toggling this UI
      document.body.classList.remove('dialog_pattern_select_dropdown');
      const toggleBtn = document.querySelector('[data-toggle-for="pattern_select_dropdown"]');
      if (toggleBtn) toggleBtn.classList.remove('active');
    }
  }

  setCurrentPattern(pattern: StringArt<any>) {
    this.pattern = pattern;
    if (this.elements.patternName) {
      this.elements.patternName.innerText = pattern?.name ?? 'Choose a pattern';
    }
  }

  #createThumbnailsSection(title: string, patterns: StringArt[], target: HTMLElement): void {
    const section = document.createElement('section');

    const sectionTitle = document.createElement('h3');
    sectionTitle.className = 'pattern_select_thumbnails_title';
    sectionTitle.innerText = title;
    section.appendChild(sectionTitle);

    const thumbnailsList = document.createElement('ul');
    thumbnailsList.className = 'pattern_select_thumbnails';
    section.appendChild(thumbnailsList);

    const thumbnailsFragment = document.createDocumentFragment();
    const patternThumbnails: Record<string, HTMLElement> = {};

    patterns.forEach(pattern => {
      const patternLink = document.createElement('a');

      patternLink.style.width = patternLink.style.height = THUMBNAIL_WIDTH_PX;
      patternThumbnails[pattern.id] = patternLink;

      const thumbnailConfig = pattern.thumbnailConfig;

      pattern.assignConfig({
        margin: 1,
        enableBackground:
          !pattern.config.darkMode || pattern.config.customBackgroundColor,
        nailRadius: 0.5,
        ...(thumbnailConfig instanceof Function
          ? thumbnailConfig(pattern.config)
          : thumbnailConfig),
      });

      const li = document.createElement('li');
      thumbnailsFragment.appendChild(li);

      patternLink.href = `?pattern=${pattern.id}`;
      patternLink.setAttribute('data-pattern', pattern.id);
      patternLink.title = pattern.name;
      
      patternLink.addEventListener('click', e => {
        e.preventDefault();
        this.emit('select', { patternId: pattern.id });
        this.toggle(); // Close the thumbnails dropdown
      });
      
      li.appendChild(patternLink);
    });

    thumbnailsList.appendChild(thumbnailsFragment);

    target.appendChild(section);

    patterns.forEach(pattern => {
      const renderer = new CanvasRenderer(patternThumbnails[pattern.id], {
        updateOnResize: false,
      });
      renderer.setFixedSize([100, 100]);
      try {
        pattern.draw(renderer);
      } catch (error) {
        console.error(
          `Failed to render thumbnail for pattern [id=${pattern.id}]`,
          error
        );
      }
    });
  }


  createThumbnails(container?: HTMLElement) {
    const target = container ?? this.elements.thumbnails;
    target.innerHTML = '';

    const savedPatterns = Persistance.getSavedPatterns();
    if (savedPatterns.length) {
      this.#createThumbnailsSection(
        'My Patterns',
        Persistance.getSavedPatterns(),
        target
      );
    }
    const patterns = getAllPatternsTypes();
    this.#createThumbnailsSection('Built-in patterns', patterns, target);
  }

  renderLandingGallery(container: HTMLElement) {
    container.innerHTML = '';
    const savedPatterns = Persistance.getSavedPatterns();
    const patterns = getAllPatternsTypes();

    const renderCard = (pattern: StringArt<any>) => {
      const card = document.createElement('div');
      card.className = 'pattern_card';
      card.title = pattern.name;
      card.dataset.patternId = pattern.id;

      const preview = document.createElement('div');
      preview.className = 'preview';

      const label = document.createElement('div');
      label.className = 'label';
      label.innerText = pattern.name;

      card.appendChild(preview);
      card.appendChild(label);
      container.appendChild(card);

      const thumbnailConfig = pattern.thumbnailConfig;

      // Reset to base config, keeping original colors
      pattern.assignConfig({
        margin: 1,
        nailRadius: 0.5,
        showStrings: true,
        showNails: false,
        darkMode: false,
        enableBackground: false,
        ...(thumbnailConfig instanceof Function
          ? thumbnailConfig(pattern.config)
          : thumbnailConfig),
      });

      const rect = preview.getBoundingClientRect();
      const size = rect.width || 120;

      const renderer = new CanvasRenderer(preview, { updateOnResize: false });
      renderer.setFixedSize([size, size]);

      // Now draw the pattern
      try {
        pattern.draw(renderer);
      } catch (error) {
        console.error(`Failed to render thumbnail for ${pattern.id}`, error);
      }

      card.addEventListener('click', () => {
        const freshPattern = findPatternById(pattern.id);
        routing.navigateToPattern(freshPattern);
      });
    };

    patterns.forEach(renderCard);
    savedPatterns.forEach(renderCard);
  }
}
