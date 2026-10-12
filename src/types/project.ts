export interface SagaProjectItem {
  id: string;
  title: string;
  universe: string;
  timelineScope?: string | null;
  theme?: string | null;
  worldNotes?: string | null;
  coverImage?: string;
  characterCount: number;
  partCount: number;
  completedParts: number;
  sceneCount: number;
  totalWordCount: number;
  createdAt: string;
  updatedAt: string;
}
