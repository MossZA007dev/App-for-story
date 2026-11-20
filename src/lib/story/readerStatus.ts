import { z } from "zod";
const evidence = z.object({
  sceneId: z.string(),
  block: z.number().int().min(1),
  quote: z.string().trim().min(4).max(220),
});
const supported = z.array(evidence).min(1).max(3);
export const ReaderStatusSchema = z.object({
  overview: z.string().max(1500),
  comparison: z.object({
    verdict: z.enum(["insufficient", "tentative"]),
    leaders: z.array(z.string()).max(5),
    reason: z.string().max(1500),
    evidence: z.array(evidence).max(4),
  }),
  characters: z
    .array(
      z.object({
        name: z.string().max(200),
        summary: z.string().max(700),
        evidence: supported,
        abilities: z
          .array(
            z.object({
              name: z.string().max(150),
              state: z.enum(["used", "learning", "mentioned"]),
              detail: z.string().max(700),
              evidence: supported,
            }),
          )
          .max(12),
        relationships: z
          .array(
            z.object({
              with: z.string().max(200),
              label: z.string().max(100),
              kind: z.enum(["ally", "conflict", "family", "romantic", "unknown"]).default("unknown"),
              detail: z.string().max(700),
              evidence: supported,
            }),
          )
          .max(12),
      }),
    )
    .max(30),
});
export type ReaderStatus = z.infer<typeof ReaderStatusSchema>;
export type ReaderStatusEnvelope = {
  summary: ReaderStatus | null;
  mode: "local" | "ai";
  configured: boolean;
  cached: boolean;
  model?: string;
  checkpoint: { sceneId: string; sceneTitle: string; block: number };
  coverage: { scenes: number; blocks: number; partial: boolean };
  roster: { name: string; avatarUrl: string | null }[];
  createdAt?: string;
};

// Provider-enforced structure as well as independent Zod/evidence validation.
const jsonString = { type: 'string' };
const jsonArray = (items: object, maxItems: number) => ({ type: 'array', items, maxItems });
const jsonObject = (properties: Record<string, object>) => ({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const jsonEvidence = jsonArray({type:'string',pattern:'^p[1-9][0-9]*$',description:'IDs of supporting passages; for example p17. Never copy quotations or generate scene IDs.'},2);
export const READER_STATUS_JSON_SCHEMA = jsonObject({
  overview:jsonString,
  comparison:jsonObject({verdict:{type:'string',enum:['insufficient','tentative']},leaders:jsonArray(jsonString,5),reason:jsonString,evidence:jsonEvidence}),
  characters:jsonArray(jsonObject({name:jsonString,summary:jsonString,evidence:jsonEvidence,
    abilities:jsonArray(jsonObject({name:jsonString,state:{type:'string',enum:['used','learning','mentioned']},detail:jsonString,evidence:jsonEvidence}),3),
    relationships:jsonArray(jsonObject({with:jsonString,label:jsonString,kind:{type:'string',enum:['ally','conflict','family','romantic','unknown']},detail:jsonString,evidence:jsonEvidence}),3),
  }),8),
});
