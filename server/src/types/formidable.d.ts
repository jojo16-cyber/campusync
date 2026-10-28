declare module 'formidable' {
  export interface File {
    filepath: string;
    originalFilename: string | null;
    newFilename: string;
    mimetype: string | null;
    size: number;
    lastModifiedDate?: Date;
    hashAlgorithm?: false | string;
    hash?: string | null;
  }

  export type Files = Record<string, File | File[]>;
  export type Fields = Record<string, string | string[]>;

  export interface Options {
    maxFileSize?: number;
    maxFiles?: number;
    maxTotalFileSize?: number;
    multiples?: boolean;
    uploadDir?: string;
    keepExtensions?: boolean;
    allowEmptyFiles?: boolean;
    filter?: (part: { name: string; originalFilename?: string | null; mimetype?: string | null }) => boolean;
  }

  export interface FormidableInstance {
    parse(req: unknown): Promise<[Fields, Files]>;
    options: Options;
  }

  export function formidable(options?: Options): FormidableInstance;
  export default formidable;
}
