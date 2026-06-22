export type ImageMode = "generations" | "edits";

export type SpecRow = {
  name: string;
  type: string;
  required: boolean;
  descriptionKey: string;
};

export type EndpointDoc = {
  mode: ImageMode;
  titleKey: string;
  descriptionKey: string;
  method: "POST";
  path: string;
  contentType: string;
  requestRows: SpecRow[];
  responseRows: SpecRow[];
  curlMode: ImageMode;
};

export type GeneratedImage = { src: string; revisedPrompt?: string };

export type UploadedImage = { id: string; file: File; previewUrl: string };
