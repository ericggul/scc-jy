import type {
  InstitutionId,
  NetworkSystemSnapshot,
} from "@/components/network-system/1/model";

export type InstitutionWrapperProps = {
  institutionId: InstitutionId;
  snapshot: NetworkSystemSnapshot;
  active: boolean;
};
