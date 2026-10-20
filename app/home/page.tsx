import type { Metadata } from "next";
import { HomeExperience } from "@/components/home/HomeExperience";

export const metadata: Metadata = {
  title: "Catalyst Academy · Find your edge",
  description: "Interactive, bite-sized lessons on prediction markets. Take the Find Your Edge quiz to get your starting lesson.",
};

export default function HomePage() {
  return <HomeExperience />;
}
