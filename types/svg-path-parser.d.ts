declare module 'svg-path-parser' {
  export interface Command {
    code: string;
    command: string;
    relative?: boolean;
    x?: number;
    y?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    rx?: number;
    ry?: number;
    xAxisRotation?: number;
    largeArc?: boolean;
    sweep?: boolean;
    [key: string]: any;
  }

  export function parseSVG(pathData: string): Command[];
}

