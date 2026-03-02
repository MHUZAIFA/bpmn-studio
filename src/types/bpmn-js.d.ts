declare module 'bpmn-js/lib/Modeler' {
  interface ModelerOptions {
    container: HTMLElement;
    keyboard?: { bindTo: HTMLElement | Document };
    additionalModules?: unknown[];
    moddleExtensions?: Record<string, unknown>;
  }

  interface ImportXMLResult {
    warnings: string[];
  }

  interface SaveXMLResult {
    xml: string;
  }

  interface SaveSVGResult {
    svg: string;
  }

  class Modeler {
    constructor(options: ModelerOptions);
    importXML(xml: string): Promise<ImportXMLResult>;
    saveXML(options?: { format?: boolean }): Promise<SaveXMLResult>;
    saveSVG(): Promise<SaveSVGResult>;
    get(serviceName: string): unknown;
    on(event: string, callback: (...args: unknown[]) => void): void;
    off(event: string, callback: (...args: unknown[]) => void): void;
    destroy(): void;
    attachTo(parentNode: HTMLElement): void;
    detach(): void;
  }

  export default Modeler;
}

declare module 'bpmn-js/lib/NavigatedViewer' {
  interface ViewerOptions {
    container: HTMLElement;
    additionalModules?: unknown[];
  }

  interface ImportXMLResult {
    warnings: string[];
  }

  class NavigatedViewer {
    constructor(options: ViewerOptions);
    importXML(xml: string): Promise<ImportXMLResult>;
    get(serviceName: string): unknown;
    on(event: string, callback: (...args: unknown[]) => void): void;
    destroy(): void;
    attachTo(parentNode: HTMLElement): void;
    detach(): void;
  }

  export default NavigatedViewer;
}
