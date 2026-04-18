import TrackerApp from "@/components/TrackerApp";
import { TrackerProvider } from "@/context/TrackerContext";

export default function Home() {
  return (
    <TrackerProvider>
      <TrackerApp />
    </TrackerProvider>
  );
}
