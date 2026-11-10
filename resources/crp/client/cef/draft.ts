export interface Draft {
  name?: string;
  gender: number;
  father: number;
  mother: number;
  similarity: number;
  skin: number;
  hair: number;
  hairColor: number;
  hairHighlightColor: number;
  eyebrowColor: number;
  beardColor: number;
  eyeColor: number;
  blushColor: number;
  lipstickColor: number;
  chestHairColor: number;
  Features: { value: number; order: number }[];
  Appearances: { value: number; opacity: number; order: number }[];
}

const FIELDS: Record<string, keyof Draft> = {
  Gender: 'gender',
  Hairstyle: 'hair',
  HairColor: 'hairColor',
  HairHighlightColor: 'hairHighlightColor',
  EyebrowColor: 'eyebrowColor',
  FacialHairColor: 'beardColor',
  EyeColor: 'eyeColor',
  BlushColor: 'blushColor',
  LipstickColor: 'lipstickColor',
  ChestHairColor: 'chestHairColor',
  Mother: 'mother',
  Father: 'father',
  Similarity: 'similarity',
  Skin: 'skin',
};

let draft: Draft = freshDraft();

export function freshDraft(): Draft {
  return {
    gender: 0,
    father: 0,
    mother: 21,
    similarity: 100,
    skin: 0,
    hair: 0,
    hairColor: 0,
    hairHighlightColor: 0,
    eyebrowColor: 0,
    beardColor: 0,
    eyeColor: 0,
    blushColor: 0,
    lipstickColor: 0,
    chestHairColor: 0,
    Features: Array.from({ length: 20 }, (_, order) => ({ value: 0, order })),
    Appearances: Array.from({ length: 11 }, (_, order) => ({ value: 255, opacity: 1, order })),
  };
}

export function resetDraft(): void {
  draft = freshDraft();
}

export function currentDraft(): Draft {
  return draft;
}

export function applySetter(name: string, value: number): void {
  const field = FIELDS[name];
  if (!field) return;
  (draft[field] as number) = value;
}
