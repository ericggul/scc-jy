import DdongMeongMobile from "@/components/mobile";
import { entryContextFromQuery } from "@/components/model/entry-context";

export default async function DdongMeongPage({
  searchParams,
}: {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const entryContext = entryContextFromQuery(await searchParams);
  return <DdongMeongMobile entryContext={entryContext} />;
}
