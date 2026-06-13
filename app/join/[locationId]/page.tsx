import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JoinSection, { SIGNUP_LOCATIONS } from "@/app/components/JoinSection";

type PageProps = {
  params: Promise<{ locationId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locationId } = await params;
  const location = SIGNUP_LOCATIONS.find((item) => item.id === locationId);

  return {
    title: location
      ? `${location.name} Signup · Access Bank World Cup Predictions`
      : "Location Signup · Access Bank World Cup Predictions",
    description: location
      ? `Register for the Access Bank prediction league from ${location.name}.`
      : "Register for the Access Bank prediction league from a specific location.",
  };
}

export default async function LocationJoinPage({ params }: PageProps) {
  const { locationId } = await params;
  const location = SIGNUP_LOCATIONS.find((item) => item.id === locationId);

  if (!location) {
    notFound();
  }

  return <JoinSection locationId={location.id} />;
}
