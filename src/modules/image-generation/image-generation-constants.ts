import type { AuthFileItem } from "@/lib/http/types";
import type { EndpointDoc, ImageMode, SpecRow } from "@/modules/image-generation/image-generation-types";

export const GPT_IMAGE_MODEL = "gpt-image-2";

export const GENERATION_STATUS_KEYS = [
  "image_generation.generation_status_drafting",
  "image_generation.generation_status_creating",
  "image_generation.generation_status_refining",
  "image_generation.generation_status_starting",
] as const;

export const GENERATION_STATUS_INTERVAL_MS = 1800;
export const IMAGE_GENERATION_TASK_POLL_INTERVAL_MS = 1200;

export const IMAGE_GENERATION_PHASE_STATUS_INDEX: Record<string, number> = {
  queued: 0,
  bootstrap: 0,
  chat_requirements: 0,
  conversation_init: 0,
  conversation_prepare: 0,
  conversation_request: 1,
  conversation_stream: 1,
  conversation_poll: 2,
  image_download: 3,
  completed: 3,
};

export const SIZE_OPTIONS = ["1024x1024", "1792x1024", "1024x1792", "2560x1440", "2160x3840"] as const;
export const QUALITY_OPTIONS = ["low", "medium", "high"] as const;
export const COUNT_OPTIONS = [1, 2, 3, 4] as const;
export const MAX_UPLOAD_IMAGES = 5;
export const IMAGE_EDITS_ENABLED = true;

const RESPONSE_ROWS: SpecRow[] = [
  {
    name: "created",
    type: "number",
    required: false,
    descriptionKey: "image_generation.response_created_desc",
  },
  {
    name: "data[].b64_json",
    type: "string",
    required: true,
    descriptionKey: "image_generation.response_b64_desc",
  },
  {
    name: "data[].revised_prompt",
    type: "string",
    required: false,
    descriptionKey: "image_generation.response_revised_prompt_desc",
  },
];

const ENDPOINT_DOCS: EndpointDoc[] = [
  {
    mode: "generations",
    titleKey: "image_generation.text_to_image_title",
    descriptionKey: "image_generation.text_to_image_desc",
    method: "POST",
    path: "/v1/images/generations",
    contentType: "application/json",
    requestRows: [
      {
        name: "model",
        type: "string",
        required: true,
        descriptionKey: "image_generation.param_model_desc",
      },
      {
        name: "prompt",
        type: "string",
        required: true,
        descriptionKey: "image_generation.param_prompt_desc",
      },
      {
        name: "size",
        type: "string",
        required: false,
        descriptionKey: "image_generation.param_size_desc",
      },
      {
        name: "quality",
        type: "string",
        required: false,
        descriptionKey: "image_generation.param_quality_desc",
      },
      {
        name: "n",
        type: "number",
        required: false,
        descriptionKey: "image_generation.param_n_desc",
      },
    ],
    responseRows: RESPONSE_ROWS,
    curlMode: "generations",
  },
  {
    mode: "edits",
    titleKey: "image_generation.image_to_image_title",
    descriptionKey: "image_generation.image_to_image_desc",
    method: "POST",
    path: "/v1/images/edits",
    contentType: "multipart/form-data",
    requestRows: [
      {
        name: "model",
        type: "string",
        required: true,
        descriptionKey: "image_generation.param_model_desc",
      },
      {
        name: "prompt",
        type: "string",
        required: true,
        descriptionKey: "image_generation.param_edit_prompt_desc",
      },
      {
        name: "image",
        type: "file",
        required: true,
        descriptionKey: "image_generation.param_images_desc",
      },
      {
        name: "size",
        type: "string",
        required: false,
        descriptionKey: "image_generation.param_size_desc",
      },
      {
        name: "quality",
        type: "string",
        required: false,
        descriptionKey: "image_generation.param_quality_desc",
      },
      {
        name: "n",
        type: "number",
        required: false,
        descriptionKey: "image_generation.param_n_desc",
      },
    ],
    responseRows: RESPONSE_ROWS,
    curlMode: "edits",
  },
];

export const VISIBLE_ENDPOINT_DOCS = IMAGE_EDITS_ENABLED
  ? ENDPOINT_DOCS
  : ENDPOINT_DOCS.filter((doc) => doc.mode === "generations");

export const isCodexOauthFile = (file: AuthFileItem): boolean => {
  const accountType = String(file.account_type ?? "")
    .trim()
    .toLowerCase();
  const provider = String(file.type ?? file.provider ?? "")
    .trim()
    .toLowerCase();
  return accountType === "oauth" && provider === "codex";
};

export const buildCurlExample = (mode: ImageMode, promptExample: string): string => {
  if (mode === "edits") {
    return [
      "curl http://127.0.0.1:8317/v1/images/edits \\",
      '  -H "Authorization: Bearer $API_KEY" \\',
      '  -F "model=gpt-image-2" \\',
      `  -F "prompt=${promptExample}" \\`,
      '  -F "size=1024x1024" \\',
      '  -F "quality=high" \\',
      '  -F "n=1" \\',
      '  -F "image=@/path/to/image.png"',
    ].join("\n");
  }

  return [
    "curl http://127.0.0.1:8317/v1/images/generations \\",
    '  -H "Authorization: Bearer $API_KEY" \\',
    '  -H "Content-Type: application/json" \\',
    "  -d '{",
    '    "model": "gpt-image-2",',
    `    "prompt": "${promptExample}",`,
    '    "size": "1024x1024",',
    '    "quality": "high",',
    '    "n": 1',
    "  }'",
  ].join("\n");
};
