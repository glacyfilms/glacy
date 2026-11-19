import Videos from "@/components/Videos";
import About from "@/components/About";
import World from "@/components/World";
import Social from "@/components/Social";
import Footer from "@/components/Footer";
import { getLatestVideos } from "@/lib/youtube";

// re-render every 30 min so new uploads show up without a redeploy
export const revalidate = 1800;

export default async function Home() {
  const videos = await getLatestVideos();
  return (
    <>
      <Videos videos={videos} />
      <main>
        <About />
        <World videos={videos} />
        <Social />
      </main>
      <Footer />
    </>
  );
}
