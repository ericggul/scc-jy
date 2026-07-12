import type { ComponentType } from "react";
import type { InstitutionId } from "@/components/network-system/1/model";
import { MinimalInstitutionWrapper } from "@/components/network-system/1/wrappers/minimal";
import type { InstitutionWrapperProps } from "@/components/network-system/1/wrappers/types";

export const institutionWrapperRegistry: Record<
  InstitutionId,
  ComponentType<InstitutionWrapperProps>
> = {
  "central-bank": MinimalInstitutionWrapper,
  treasury: MinimalInstitutionWrapper,
  banks: MinimalInstitutionWrapper,
  "private-economy": MinimalInstitutionWrapper,
};
