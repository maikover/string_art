import Color from '../helpers/color/Color';
import StringArt from '../infra/StringArt';
import Circle, { CircleConfig } from '../shapes/Circle';
import { ColorConfig } from '../helpers/color/color.types';
import { ControlsConfig } from '../types/config.types';
import { CalcOptions } from '../types/stringart.types';
import NailsSetter from '../infra/nails/NailsSetter';
import Controller from '../infra/Controller';
import Nails from '../infra/nails/Nails';
import { withoutAttribute } from '../helpers/config_utils';

export interface DreamcatcherConfig extends ColorConfig {
  n: number;
  petals: number;
  amplitude: number;
  layers: number;
  rotation: number;
  reverse?: boolean;
}

export interface DreamcatcherCalc {
  n: number;
  circle: Circle;
}

export default class Dreamcatcher extends StringArt<
  DreamcatcherConfig,
  DreamcatcherCalc
> {
  static type = 'dreamcatcher';

  name = 'Loto Místico';
  id = 'dreamcatcher';
  controls: ControlsConfig<DreamcatcherConfig> = [
    {
      ...Circle.nailsConfig,
      defaultValue: 170,
    },
    {
      key: 'petals',
      label: 'Petals',
      defaultValue: 10,
      type: 'range',
      attr: { min: 3, max: 30, step: 1 },
      isStructural: true,
    },
    {
      key: 'amplitude',
      label: 'Amplitude',
      defaultValue: 59,
      type: 'range',
      attr: { min: 10, max: 100, step: 1 },
      isStructural: true,
    },
    {
      key: 'layers',
      label: 'i18n:pl_layers',
      defaultValue: 5,
      type: 'range',
      attr: { min: 1, max: 20, step: 1 },
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
        color: '#b000ff',
      },
    }),
  ];

  getCalc({ size }: CalcOptions): DreamcatcherCalc {
    const { n, rotation, reverse } = this.config;
    const circleConfig: CircleConfig = {
      size,
      n,
      rotation,
      reverse,
    };

    return {
      n,
      circle: new Circle(circleConfig),
    };
  }

  getAspectRatio(options: CalcOptions): number {
    return this.getCalc(options).circle.getAspectRatio();
  }

  *drawStrings(controller: Controller): Generator<void> {
    const { petals, amplitude, layers, n } = this.config;
    const { circle } = this.calc;

    // Amplitude is treated as a percentage of n so the pattern scales exactly the same
    // regardless of the number of nails (thumbnail vs canvas)
    const maxOffsetBase = (amplitude / 100) * n;

    for (let L = 0; L < layers; L++) {
      const currentMaxOffset = maxOffsetBase * (1 - L * 0.05); // slightly smaller nested layers
      const color = this.color.getColor(L * Math.floor(200 / Math.max(layers, 1)));
      
      controller.startLayer({ color, name: `Layer ${L + 1}` });

      for (let i = 0; i < n; i++) {
        const angle = i * Math.PI * 2 / n;
        const offset = Math.round(currentMaxOffset * Math.sin(petals * angle));
        const target = ((i + offset) % n + n) % n;

        controller.goto(circle.getNailKey(i));
        controller.stringTo(circle.getNailKey(target));
        yield;
      }
    }
  }

  getNails(precision?: number): Nails {
    return this.calc.circle.getNails(precision);
  }

  getStepCount(options: CalcOptions): number {
    return this.config.n * this.config.layers;
  }

  getNailCount(): number {
    return this.config.n;
  }

  thumbnailConfig = ({ n }) => ({
    n: Math.min(n, 100),
  });
}
