declare module "percollate" {
  export interface PercollateOptions {
    output?: string;
    individual?: boolean;
    template?: string;
    style?: string;
    css?: string;
    html?: boolean;
    pdf?: boolean;
    epub?: boolean;
    wait?: number;
    "no-amp"?: boolean;
    "no-toc"?: boolean;
    "bundle-images"?: boolean;
    "inline-images"?: boolean;
    debug?: boolean;
    verbose?: boolean;
    sandbox?: boolean;
    headless?: boolean;
    timeout?: number;
    title?: string;
  }

  export interface PercollateConfig {
    urls: string[];
    options: PercollateOptions;
  }

  export function pdf(
    urls: string[],
    options?: PercollateOptions,
  ): Promise<Buffer>;
  export function epub(
    urls: string[],
    options?: PercollateOptions,
  ): Promise<Buffer>;
  export function html(
    urls: string[],
    options?: PercollateOptions,
  ): Promise<string>;
}
