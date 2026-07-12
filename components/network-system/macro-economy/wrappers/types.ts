import type {
  InstitutionId,
  NetworkSystemSnapshot,
} from "@/components/network-system/macro-economy/model";

export type InstitutionWrapperProps = {
  institutionId: InstitutionId;
  snapshot: NetworkSystemSnapshot;
  active: boolean;
};
