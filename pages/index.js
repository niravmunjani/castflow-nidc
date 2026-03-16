import dynamic from "next/dynamic";
import Head from "next/head";
const App = dynamic(() => import("../components/CastFlowApp"), { ssr: false });
export default function Home() {
  return (
    <>
      <Head><title>CastFlow NIDC</title></Head>
      <App />
    </>
  );
}
