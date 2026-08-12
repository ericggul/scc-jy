export type VideoMedia = {
  id: string;
  kind: "video";
  src: string;
  alt: string;
};

export type ImageMedia = {
  id: string;
  kind: "image";
  src: string;
  alt: string;
};

export type FieldMedia = VideoMedia | ImageMedia;

export const videoMedia = {
  dance67: {
    id: "dance-67",
    kind: "video",
    src: "/video/videos/67-dance.mp4",
    alt: "A person performing the 67 dance gesture",
  },
  facepalm: {
    id: "facepalm",
    kind: "video",
    src: "/video/videos/facepalm.mp4",
    alt: "A person making a facepalm gesture",
  },
  youtubePoop: {
    id: "youtube-poop",
    kind: "video",
    src: "/video/videos/youtube-poop.mp4",
    alt: "Rapidly edited public-domain gun-safety footage",
  },
  catJump: {
    id: "cat-jump",
    kind: "video",
    src: "/video/videos/cat-jump.mp4",
    alt: "A cat jumping backwards",
  },
  catOnBed: {
    id: "cat-on-bed",
    kind: "video",
    src: "/video/videos/cat-on-bed.mp4",
    alt: "An AI-generated cat moving on a bed",
  },
} as const satisfies Record<string, VideoMedia>;
