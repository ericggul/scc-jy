import type { ComponentType } from "react";
import type { InstitutionId } from "@/components/network-system/macro-economy/model";
import { MinimalInstitutionWrapper } from "@/components/network-system/macro-economy/wrappers/minimal";
import type { InstitutionWrapperProps } from "@/components/network-system/macro-economy/wrappers/types";

export const institutionWrapperRegistry: Record<
  InstitutionId,
  ComponentType<InstitutionWrapperProps>
> = {
  "central-bank": MinimalInstitutionWrapper,
  treasury: MinimalInstitutionWrapper,
  banks: MinimalInstitutionWrapper,
  "private-economy": MinimalInstitutionWrapper,
};
