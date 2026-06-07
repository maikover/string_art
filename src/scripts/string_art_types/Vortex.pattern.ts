import Color from '../helpers/color/Color';
import Circle from '../shapes/Circle';
import StringArt from '../infra/StringArt';
import { ControlsConfig } from '../types/config.types';
import { formatFractionAsPercent } from '../helpers/string_utils';
import { withoutAttribute } from '../helpers/config_utils';
import { CalcOptions } from '../types/stringart.types';
import Controller from '../infra/Controller';
import Nails from '../infra/nails/Nails';
import { ColorConfig } from '../helpers/color/color.types';

export interface VortexConfig extends ColorConfig {
  n: number;
  layers: number;
  layerFill: number;
  layerSpread: number;
  vortexIntensity: number;
  rotation: number;
  reverse?: boolean;
}

export interface VortexCalc {
  n: number;
  circle: Circle;
}

export default class DynamicVortex extends StringArt<VortexConfig, VortexCalc> {
  static type = 'vortex';

  id = 'vortex';
  name = 'Vórtice (Nautilus)';
  controls: ControlsConfig<VortexConfig> = [
    {
      ...Circle.nailsConfig,
      defaultValue: 44, // Matched to user screenshot
    },
    {
      key: 'layers',
      label: 'i18n:pl_layers',
      defaultValue: 15,
      type: 'range',
      attr: { min: 1, max: 30, step: 1 },
      isStructural: true,
    },
    {
      key: 'layerFill',
      label: 'i18n:pl_layer_fill',
      defaultValue: 0.5,
      type: 'range',
      attr: {
        min: ({ n }) => 1 / n,
        max: 1,
        step: ({ n }) => 1 / n,
      },
      displayValue: ({ layerFill }) => formatFractionAsPercent(layerFill),
      isStructural: true,
    },
    {
      key: 'layerSpread',
      label: 'Twist (Shift)',
      defaultValue: 0, // Matched to user screenshot
      type: 'range',
      attr: {
        min: 0,
        max: 0.5,
        step: ({ n }) => 1 / n,
      },
      displayValue: ({ layerSpread, n }) => Math.round(layerSpread * n),
      isStructural: true,
    },
    {
      key: 'vortexIntensity',
      label: 'Suavizado de Radio',
      defaultValue: 1.1, // Matched to user screenshot
      type: 'range',
      attr: { min: 0.2, max: 5, step: 0.1 },
      isStructural: true,
    },
    withoutAttribute(Circle.rotationConfig, 'snap'),
    {
      key: 'reverse',
      label: 'i18n:pl_reverse',
      defaultValue: false,
      type: 'checkbox',
      isStructural: true,
    },
    Color.getConfig({
      defaults: {
        isMultiColor: true,
        multicolorRange: 200,
        multicolorStart: 200,
        color: '#ff0055',
      },
    }),
  ];

  getCalc({ size }: CalcOptions): VortexCalc {
    const { n, rotation, reverse } = this.config;
    return {
      n,
      circle: new Circle({ size, n, rotation, reverse }),
    };
  }

  getAspectRatio(options: CalcOptions): number {
    return this.getCalc(options).circle.getAspectRatio();
  }

  *drawStrings(controller: Controller): Generator<void> {
    const { layers, layerFill, layerSpread, vortexIntensity, reverse, n } = this.config;
    const { circle } = this.calc;
    const direction = reverse ? -1 : 1;

    const stringsPerLayer = Math.floor(n * layerFill);
    const layerShift = Math.round(n * layerSpread);

    const minStep = Math.max(1, Math.floor(n * 0.02));
    const maxStep = Math.max(minStep + 1, Math.floor(n * 0.48));

    for (let layer = 0; layer < layers; layer++) {
      const t = layers > 1 ? layer / (layers - 1) : 0;
      const easedT = Math.pow(t, vortexIntensity);
      
      // Option 3 goes from large step (deep hole) to small step (shallow hole) or vice versa.
      // To match exactly, we do maxStep down to minStep.
      const step = Math.floor(maxStep - (maxStep - minStep) * easedT);

      let shift = Math.round(layerShift * layer * direction);
      shift = ((shift % n) + n) % n;

      const color = this.color.getColor(layer);
      controller.startLayer({ color, name: `Layer ${layer + 1}` });
      controller.goto(circle.getNailKey(shift));

      for (let i = 0; i < stringsPerLayer; i++) {
        const pos1 = (i + shift) % n;
        const pos2 = ((pos1 + step) % n + n) % n;

        if (i > 0) {
          controller.stringTo(circle.getNailKey(pos1));
        }
        controller.stringTo(circle.getNailKey(pos2));
        yield;
      }
    }
  }

  getNails(precision?: number): Nails {
    return this.calc.circle.getNails(precision);
  }

  getStepCount(options: CalcOptions): number {
    const { layers, layerFill } = this.config;
    const stringsPerLayer = Math.floor(this.config.n * layerFill);
    return layers * (2 * stringsPerLayer - 1);
  }

  getNailCount(): number {
    return this.config.n;
  }

  thumbnailConfig = ({ n }) => ({
    n: Math.min(n, 100),
  });
}
