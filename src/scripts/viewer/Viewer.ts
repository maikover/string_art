import EventBus from '../helpers/EventBus';
import CanvasRenderer from '../infra/renderers/CanvasRenderer';
import Renderer from '../infra/renderers/Renderer';
import SVGRenderer from '../infra/renderers/SVGRenderer';
import routing from '../routing';
import StringArt, { DrawOptions } from '../infra/StringArt';
import { Dimensions } from '../types/general.types';
import { RendererType } from '../types/stringart.types';
import viewOptions from './ViewOptions';

export default class Viewer extends EventBus<{
  positionChange: { changeBy: number };
  click: void;
  touchStart: void;
  touchEnd: void;
}> {
  element: HTMLElement;
  renderer: Renderer | null;
  pattern: StringArt;
  rendererType: RendererType;
  cancelDraw: (() => void) | null;

  // Touch gesture state
  #isTouching = false;
  #isGesturing = false;
  #lastTouchTime = 0;
  #touchStartTime = 0;
  #initialPinchDistance = 0;
  #initialScale = 1;
  #currentScale = 1;
  #minScale = 1;
  #maxScale = 4;
  #panOffset = { x: 0, y: 0 };
  #panStart = { x: 0, y: 0 };
  #activeTouches: Touch[] = [];

  constructor(rendererType: RendererType = 'canvas') {
    super();

    this.rendererType = rendererType;
    this.element = document.querySelector('#canvas_panel');

    this.element.addEventListener(
      'wheel',
      ({ deltaY }) => {
        const direction = -deltaY / Math.abs(deltaY); // Up is 1, down is -1
        this.emit('positionChange', { changeBy: direction });
      },
      { passive: true }
    );

    // Touch gesture events
    this.element.addEventListener('touchstart', this.#onTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.#onTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.#onTouchEnd.bind(this), { passive: false });

    viewOptions.addEventListener(
      'showInstructionsChange',
      ({ showInstructions }) => {
        this.#withRenderer();
        if (showInstructions) {
          this.renderer.showInstructions();
        } else {
          this.renderer.hideInstructions();
        }
      }
    );

    routing.addEventListener('renderer', rendererType => {
      this.rendererType = rendererType;
      this.renderer = null;
    });
  }

  get position(): number {
    return this.pattern?.position ?? -1;
  }

  get size(): Dimensions {
    return [this.element.clientWidth, this.element.clientHeight];
  }

  setSize(size: Dimensions | null) {
    this.#withRenderer();

    if (size) {
      if (!this.element.classList.contains('overflow')) {
        this.element.classList.add('overflow');
      }
      this.renderer.setFixedSize(size);
    } else {
      this.element.classList.remove('overflow');
      this.renderer.resetSize();
    }
  }

  getLastStringNailNumbers(): [number, number] {
    return this.pattern.getLastStringNailNumbers();
  }

  setRenderer(renderer: Renderer) {
    this.renderer = renderer;

    renderer.addEventListener('sizeChange', ({ size }) =>
      this.#updateOnSizeChange(size)
    );
  }

  setPattern(pattern: StringArt) {
    this.pattern = pattern;
    if (!pattern && this.renderer) {
      this.renderer.clear();
    }
  }

  #updateOnSizeChange(size: Dimensions) {
    if (size[0] && size[1]) {
      this.pattern?.draw(this.renderer, { sizeChanged: true });
    }
  }

  /**
   * Sets up click and touch events for the viewer
   */
  #setTapEvents() {
    let timeout: ReturnType<typeof setTimeout>;

    this.element.addEventListener('pointerdown', () => {
      this.emit('click', null);

      const cancelTouch = () => {
        clearTimeout(timeout);
        this.element.removeEventListener('pointerup', cancelTouch);
      };

      timeout = setTimeout(() => {
        this.element.removeEventListener('pointerup', cancelTouch);
        this.emit('touchStart', null);
        const end = () => {
          this.emit('touchEnd', null);
          this.element.removeEventListener('pointerup', end);
        };
        this.element.addEventListener('pointerup', end);
      }, 200);

      this.element.addEventListener('pointerup', cancelTouch);
    });
  }

  #onTouchStart(e: TouchEvent) {
    e.preventDefault();
    this.#activeTouches = Array.from(e.touches);
    this.#touchStartTime = Date.now();

    if (e.touches.length === 1) {
      // Single touch - potential pan
      this.#isTouching = true;
      this.#panStart = {
        x: e.touches[0].clientX - this.#panOffset.x,
        y: e.touches[0].clientY - this.#panOffset.y
      };
    } else if (e.touches.length === 2) {
      // Two fingers - pinch to zoom
      this.#isGesturing = true;
      this.#isTouching = false;
      this.#initialPinchDistance = this.#getPinchDistance(e.touches);
      this.#initialScale = this.#currentScale;
    }
  }

  #onTouchMove(e: TouchEvent) {
    e.preventDefault();

    if (this.#isGesturing && e.touches.length === 2) {
      // Pinch to zoom
      const currentDistance = this.#getPinchDistance(e.touches);
      const scaleChange = currentDistance / this.#initialPinchDistance;
      this.#currentScale = Math.min(Math.max(this.#initialScale * scaleChange, this.#minScale), this.#maxScale);

      // Calculate center point for zooming
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

      this.#applyTransform(centerX, centerY);
    } else if (this.#isTouching && e.touches.length === 1 && this.#currentScale > 1) {
      // Pan when zoomed
      const newX = e.touches[0].clientX - this.#panStart.x;
      const newY = e.touches[0].clientY - this.#panStart.y;

      // Limit pan to bounds
      const maxPanX = (this.#currentScale - 1) * this.element.clientWidth / 2;
      const maxPanY = (this.#currentScale - 1) * this.element.clientHeight / 2;

      this.#panOffset = {
        x: Math.min(Math.max(newX, -maxPanX), maxPanX),
        y: Math.min(Math.max(newY, -maxPanY), maxPanY)
      };

      this.#applyTransform();
    }
  }

  #onTouchEnd(e: TouchEvent) {
    const touchDuration = Date.now() - this.#touchStartTime;

    // If it was a short tap and not a gesture, emit click
    if (touchDuration < 300 && !this.#isGesturing && e.touches.length === 0) {
      // Small delay to ensure it's not part of a gesture
      setTimeout(() => {
        if (!this.#isGesturing) {
          this.emit('click', null);
        }
      }, 50);
    }

    // Reset states
    if (e.touches.length < 2) {
      this.#isGesturing = false;
    }
    if (e.touches.length === 0) {
      this.#isTouching = false;
      this.#activeTouches = [];
    } else if (e.touches.length === 1) {
      // Switched from pinch to single touch
      this.#isGesturing = false;
      this.#isTouching = true;
      this.#panStart = {
        x: e.touches[0].clientX - this.#panOffset.x,
        y: e.touches[0].clientY - this.#panOffset.y
      };
    }
  }

  #getPinchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  #applyTransform(centerX?: number, centerY?: number) {
    const transformOrigin = centerX !== undefined && centerY !== undefined
      ? `${centerX}px ${centerY}px`
      : 'center center';

    this.element.style.transformOrigin = transformOrigin;
    this.element.style.transform = `translate(${this.#panOffset.x}px, ${this.#panOffset.y}px) scale(${this.#currentScale})`;
  }

  resetZoom() {
    this.#currentScale = 1;
    this.#panOffset = { x: 0, y: 0 };
    this.#isGesturing = false;
    this.#isTouching = false;
    this.element.style.transform = '';
    this.element.style.transformOrigin = '';
  }

  get isZoomed(): boolean {
    return this.#currentScale > 1;
  }

  update(options?: Omit<DrawOptions, 'precision'>) {
    viewOptions.showInstructions = false;
    this.#withRenderer();
    this.pattern?.draw(this.renderer, { ...options });
  }

  goto(position: number) {
    this.#withRenderer();
    this.pattern.goto(this.renderer, position, {
      showInstructions: viewOptions.showInstructions,
    });
  }

  prev() {
    if (this.position === 0) {
      return;
    }

    this.pattern.goto(this.renderer, this.position - 1, {
      showInstructions: viewOptions.showInstructions,
    });
  }

  next(): { done: boolean } {
    return { done: this.pattern.drawNext().done };
  }

  getStepCount(): number {
    this.#withRenderer();
    return this.pattern.getStepCount({ size: this.renderer.getSize() });
  }

  #withRenderer(): asserts this is { renderer: Renderer } {
    if (!this.renderer) {
      const RendererType =
        this.rendererType === 'svg' ? SVGRenderer : CanvasRenderer;
      this.setRenderer(new RendererType(this.element));
    }
  }
}
